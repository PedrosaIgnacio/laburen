FROM postgres:15

RUN apt-get update \
  && apt-get install -y git build-essential postgresql-server-dev-15 \
  && git clone https://github.com/pgvector/pgvector.git \
  && cd pgvector \
  && make && make install
