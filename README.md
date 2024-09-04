# docker-nginx-reverse-proxy-ms-apps

Docker NGINX reverse proxy for microservices and single page applications

## Network

### Create

```sh
docker network create reverse-proxy-network
```

### Delete

```sh
docker network rm reverse-proxy-network
```

## app-be (BackEnd app)

```sh
cd app-be
docker build -t app-be .
docker run --name app-be -it -d --network reverse-proxy-network app-be
```

## app-fe (FrontEnd app)

```sh
cd app-fe
docker build -t app-fe .
docker run --name app-fe -it -d --network reverse-proxy-network app-fe
```

## nginx-reverse-proxy (Reverse Proxy)

```sh
cd nginx-reverse-proxy
docker build -t nginx-reverse-proxy .
docker run --name nginx-reverse-proxy -it -d -p 8000:80 --network reverse-proxy-network nginx-reverse-proxy
```

## Test app

NGINX Reverse Proxy and app-fe

http://localhost:8000/app-fe/

### Test app-be

http://localhost/app-be/v1/get


## Tips

Run with configuration as volume

```bash
docker run -d --name nginx-proxy \
  --network my_network \
  -p 80:80 \
  -v $(pwd)/nginx-conf/nginx.conf:/etc/nginx/conf.d/default.conf \
  nginx
```

## Example

Configuration Angular FE

### Local Test

```typescript
export const environment = {
  production: true,
  useHash: false,
  serverUrl: 'http://localhost:8000/app-be/v1/get',
};
```

### Production 


```typescript
export const environment = {
  production: true,
  useHash: false,
  serverUrl: 'http://example.com/app-be/v1/get',
};
```

### IP addr

Private or public 

```typescript
export const environment = {
  production: true,
  useHash: false,
  serverUrl: 'http://192.168.1.100:8000/app-be/v1/get',
};
```

