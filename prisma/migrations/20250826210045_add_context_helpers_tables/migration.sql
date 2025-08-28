-- CreateTable
CREATE TABLE "public"."ProcessedMessage" (
    "messageId" TEXT NOT NULL,
    "timestamp" INTEGER NOT NULL,

    CONSTRAINT "ProcessedMessage_pkey" PRIMARY KEY ("messageId")
);

-- CreateTable
CREATE TABLE "public"."ConversationContext" (
    "phoneNumber" TEXT NOT NULL,
    "context" JSONB NOT NULL,
    "lastActive" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConversationContext_pkey" PRIMARY KEY ("phoneNumber")
);
