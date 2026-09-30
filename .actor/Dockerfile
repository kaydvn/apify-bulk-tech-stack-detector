FROM apify/actor-node:20
COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY . ./
RUN node scripts/fetch-fingerprints.mjs
CMD npm start --silent
