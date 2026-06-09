ARG ECR_HOST=785328604905.dkr.ecr.eu-central-1.amazonaws.com
ARG IMAGE_TAG=node:22-alpine
FROM ${ECR_HOST}/${IMAGE_TAG} as build

# APP should be the nestjs app name (same as the path apps/$APP)
ARG APP

ARG NPM_TOKEN
ENV NPM_TOKEN=$NPM_TOKEN
ARG KALT_REGISTRY_TOKEN
ENV KALT_REGISTRY_TOKEN=$KALT_REGISTRY_TOKEN

# BUILD_INFO is expected to be *-$GIT_COMMIT (or just $GIT_COMMIT)
ARG BUILD_INFO

WORKDIR /nestApp

# Copy app package metadata
COPY .npmrc package*.json ./
COPY nest-cli.json tsconfig*.json ./

# Add gitCommit to package.json
RUN npm pkg set "gitCommit=${BUILD_INFO##*-}"

# Install dependencies
RUN npm ci

# Copy permissions.yaml app code and shared code
COPY permissions.yaml ./
COPY apps/$APP ./apps/$APP
COPY shared ./shared
COPY libs ./libs

# Build artifacts and remove dev dependencies
RUN npm run build $APP && npm prune --omit=dev


FROM ${ECR_HOST}/${IMAGE_TAG}

ARG APP

# Allow binding to ports < 1024 without sudo
RUN apk add libcap \
    && setcap 'cap_net_bind_service=+ep' /usr/local/bin/node

# Add debug tools and AWS DocumentDB CA certificate
RUN apk add --update curl net-tools \
    && curl -sS "https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem" \
       -o /etc/ssl/certs/global-bundle.pem \
    && rm -rf /var/cache/apk/*

# Create a data directory in case the app needs it
RUN mkdir /opt/kaltura \
  && chown node:node /opt/kaltura

WORKDIR /nestApp

# Copy the modified package.json and node modules
COPY --from=build /nestApp/package*.json ./
COPY --from=build /nestApp/node_modules  ./node_modules

# Copy compiled app
COPY --from=build /nestApp/dist ./dist
WORKDIR /nestApp/dist/apps/$APP
COPY --from=build /nestApp/package.json /nestApp/permissions.yaml ./

USER node

CMD ["node", "main.js"]

