# build stage: 使用 --platform=$BUILDPLATFORM 在宿主机原生架构编译前端，避免 QEMU arm64 仿真崩溃 (Illegal instruction)
FROM --platform=$BUILDPLATFORM node:20-alpine AS build-stage
# Set environment variables for non-interactive npm installs
ENV NPM_CONFIG_LOGLEVEL warn
ENV CI true
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm@9.11.0 && pnpm i --frozen-lockfile
COPY . .
RUN pnpm build

# production stage
FROM nginx:stable-alpine AS production-stage
COPY --from=build-stage /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
