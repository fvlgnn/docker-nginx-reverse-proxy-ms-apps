# app-fe (FrontEnd app)

```sh
docker build -t app-fe .
docker run --name app-fe -it --rm -p 8080:8080 --network reverse-proxy-network app-fe
```

Endpoint app-be in `script.js` (`XMLHttpRequest`) 


