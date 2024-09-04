# nginx-reverse-proxy (Reverse Proxy)

```sh
docker build -t nginx-reverse-proxy .
docker run --name nginx-reverse-proxy -it --rm -p 8000:80 --network reverse-proxy-network nginx-reverse-proxy
```
