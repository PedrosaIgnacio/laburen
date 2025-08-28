import { Injectable } from '@nestjs/common';
import axios from 'axios';
import {
  ChatGoogleGenerativeAI,
  GoogleGenerativeAIEmbeddings,
} from '@langchain/google-genai';
import { Tool } from '@langchain/core/tools';
import { AgentExecutor, createToolCallingAgent } from 'langchain/agents';
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from '@langchain/core/prompts';
import { ConfigService } from '@nestjs/config';
import { BufferMemory } from 'langchain/memory';
import { SYSTEM_PROMPT } from './prompt';
import * as dotenv from 'dotenv';
dotenv.config();

interface CartAwareTool {
  agentService?: AgentService;
}

class GetProductsTool extends Tool {
  name: string = 'get_products';
  description: string = 'Get list of products, optionally filtered by query.';
  constructor(private apiBase: string) {
    super();
  }
  async _call(query?: string) {
    try {
      let embeddingParam: string | null = null;
      if (query) {
        const embeddingClient = new GoogleGenerativeAIEmbeddings({
          model: 'text-embedding-004',
          apiKey: process.env.GEMINI_API_KEY,
        });

        const embeddings = await embeddingClient.embedQuery(query);
        embeddingParam = encodeURIComponent(JSON.stringify(embeddings));
      }

      const response = await axios.get(
        `${this.apiBase}/products${embeddingParam ? `?q=${embeddingParam}` : ''}`,
      );
      return JSON.stringify(response.data);
    } catch (error) {
      return null;
    }
  }
}

class GetProductTool extends Tool {
  name: string = 'get_product';
  description: string = 'Get details of a specific product by ID.';
  constructor(private apiBase: string) {
    super();
  }
  async _call(product_id: string) {
    try {
      const parsedJson = JSON.parse(product_id);
      const response = await axios.get(
        `${this.apiBase}/products/${Number(parsedJson.product_id)}`,
      );
      return JSON.stringify(response.data);
    } catch {
      return null;
    }
  }
}

class CreateCartTool extends Tool implements CartAwareTool {
  agentService?: AgentService;
  name: string = 'create_cart';
  description: string =
    'Create a new cart with items: list of {product_id, quantity}.';
  constructor(private apiBase: string) {
    super();
  }
  async _call(input: string) {
    try {
      const parsedJson = JSON.parse(input);
      const cartItems = parsedJson.items.map((i) => ({
        product_id: String(i.product_id),
        qty: Number(i.quantity),
      }));

      const response = await axios.post(`${this.apiBase}/carts`, {
        items: [...cartItems],
      });

      if (this.agentService) {
        this.agentService.currentCartId = response.data.id;
      }

      return response.data;
    } catch (error) {
      return null;
    }
  }
}

class UpdateCartTool extends Tool implements CartAwareTool {
  agentService?: AgentService;
  name: string = 'update_cart';
  description: string =
    'Update cart with new items list: {cartId, items}. quantity=0 removes.';
  constructor(private apiBase: string) {
    super();
  }
  async _call(input: string) {
    const { cartId, items } = JSON.parse(input);
    try {
      const response = await axios.patch(`${this.apiBase}/carts/${cartId}`, {
        items,
      });
      return response.data;
    } catch {
      return null;
    }
  }
}

class FinishShoppingCartTool extends Tool implements CartAwareTool {
  agentService?: AgentService;
  name: string = 'finish_shopping_cart';
  description: string = 'Remove from agent service current cart id';
  constructor() {
    super();
  }
  async _call() {
    if (this.agentService) this.agentService.currentCartId = null;
  }
}

class GetCartTool extends Tool implements CartAwareTool {
  agentService?: AgentService;
  name = 'get_cart';
  description = 'Get details of a specific cart by ID.';
  constructor(private apiBase: string) {
    super();
  }
  async _call() {
    if (!this.agentService?.currentCartId) return null;
    try {
      const response = await axios.get(
        `${this.apiBase}/carts/${this.agentService?.currentCartId}`,
      );
      return response.data;
    } catch {
      return null;
    }
  }
}

@Injectable()
export class AgentService {
  private agentExecutor: AgentExecutor;
  public currentCartId: number | null = null;

  constructor(private config: ConfigService) {
    const apiBase = this.config.get<string>('API_BASE')!;
    const llm = new ChatGoogleGenerativeAI({
      model: 'gemini-1.5-flash',
      apiKey: this.config.get<string>('GEMINI_API_KEY')!,
    });

    const createCartTool = new CreateCartTool(apiBase);
    createCartTool.agentService = this;

    const updateCartTool = new UpdateCartTool(apiBase);
    updateCartTool.agentService = this;

    const getCartTool = new GetCartTool(apiBase);
    getCartTool.agentService = this;

    const finishShoppingCartTool = new FinishShoppingCartTool();
    finishShoppingCartTool.agentService = this;

    const tools = [
      new GetProductsTool(apiBase),
      new GetProductTool(apiBase),
      createCartTool,
      updateCartTool,
      getCartTool,
      finishShoppingCartTool,
    ];

    const prompt = ChatPromptTemplate.fromMessages([
      ['system', SYSTEM_PROMPT],
      new MessagesPlaceholder('chat_history'),
      ['human', '{input}'],
      new MessagesPlaceholder('agent_scratchpad'),
    ]);

    const memory = new BufferMemory({
      memoryKey: 'chat_history',
      returnMessages: true,
      outputKey: 'output',
      inputKey: 'input',
    });

    const agent = createToolCallingAgent({ llm, tools, prompt });
    this.agentExecutor = new AgentExecutor({
      agent,
      tools,
      memory,
      verbose: true,
      returnIntermediateSteps: false,
    });
  }

  async invoke(inputContext: any[]) {
    if (!inputContext || inputContext.length === 0) {
      return { output: 'No context available' };
    }

    const lastMessage = inputContext[inputContext.length - 1].content;
    const rawResult = await this.agentExecutor.invoke({ input: lastMessage });

    return { output: rawResult.output };
  }
}
