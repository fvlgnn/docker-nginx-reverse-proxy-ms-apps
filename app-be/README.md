# app-be (BackEnd app)

```sh
docker build -t app-be .
docker run --name app-be -it --rm -p 3030:3030 --network reverse-proxy-network app-be
```


