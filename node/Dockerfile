FROM node as build

WORKDIR /opt
COPY . /opt

RUN npm install
RUN npm run build

FROM nginx

COPY --from=build /opt/dist/ /usr/share/nginx/html/
