# NGINX reverse proxy for containers

Esempio minimo e riproducibile di un reverse proxy NGINX davanti a un frontend
statico e a una mock API. Tutti i servizi girano in container sulla rete
privata creata automaticamente da Docker Compose.

## Architettura

```text
Browser ── http://localhost:8000 ── NGINX :8080
                                      ├── /app-fe/* ──> frontend NGINX :8080
                                      └── /app-be/* ──> mock API :8080
```

Solo il reverse proxy pubblica una porta sull'host. I prefissi `/app-fe` e
`/app-be` vengono rimossi prima di inoltrare la richiesta. `/` reindirizza a
`/app-fe/`.

Il backend usa l'immagine multiarch non-root
[`ghcr.io/fvlgnn/go-mock-api-server:1.0.0`](https://github.com/fvlgnn/go-mock-api-server/releases/tag/v1.0.0).
I JSON in `app-be/` sono montati read-only in `/config`; non viene compilato né
incluso alcun mock server locale.

## Prerequisiti

- Docker Engine o Docker Desktop;
- Docker Compose recente tramite il comando `docker compose`.

Il file usa il nome convenzionale `compose.yaml`, riconosciuto
automaticamente da Compose.

## Avvio

```sh
docker compose pull
docker compose up --build --detach --wait
```

Apri <http://localhost:8000/> e seleziona **Ottieni dati**. Arresta e rimuovi
container e rete con:

```sh
docker compose down
```

Frontend e backend non sono raggiungibili direttamente dall'host. Il loro
accesso passa sempre attraverso il reverse proxy.

## Endpoint e test manuali

| Metodo | URL pubblico | Risultato |
|---|---|---|
| `GET` | `/` | redirect permanente a `/app-fe/` |
| `GET` | `/app-fe/` | applicazione frontend |
| `GET` | `/app-be/v1/users` | elenco utenti, `200` |
| `GET` | `/app-be/v1/users/1` | singolo utente, `200` |
| `POST` | `/app-be/v1/users` | utente creato, `201` |
| `GET` | `/app-be/unknown` | route assente, `404` |
| `DELETE` | `/app-be/v1/users` | metodo non consentito, `405` |

```sh
curl --fail http://localhost:8000/app-fe/
curl --fail http://localhost:8000/app-be/v1/users
curl --fail http://localhost:8000/app-be/v1/users/1
curl --include --request POST http://localhost:8000/app-be/v1/users
```

Il backend usa corrispondenze esatte di metodo e percorso. NGINX inoltra
`/app-be/v1/users/1` come `/v1/users/1` e conserva gli header standard
`Host`, `X-Real-IP`, `X-Forwarded-For` e `X-Forwarded-Proto`.

## CORS e sviluppo frontend

Nell'uso normale non serve CORS: `script.js` chiama l'URL relativo
`/app-be/v1/users/1`, quindi pagina e API hanno la stessa origin. L'URL
relativo funziona anche con hostname, porta o HTTPS diversi da quelli locali.

Se un frontend di sviluppo gira separatamente, NGINX consente soltanto
`http://localhost:5173` per impostazione predefinita:

```js
fetch('http://localhost:8000/app-be/v1/users/1')
```

Per un'altra origin, ricrea lo stack specificandola senza path o slash finale:

```sh
CORS_ORIGIN=http://localhost:4200 docker compose up --build --detach
```

In alternativa, copia il file di esempio e personalizzalo:

```sh
cp .env.example .env
docker compose up --build --detach
```

Compose carica automaticamente `.env`; il file reale è ignorato da Git per
evitare di pubblicare configurazioni locali, mentre `.env.example` documenta
le variabili supportate.

Il proxy risponde ai preflight per `GET`, `POST` e `OPTIONS` e permette gli
header `Authorization` e `Content-Type`. Non usa il permissivo
`Access-Control-Allow-Origin: *`; le origin non corrispondenti non ricevono
header CORS.

```sh
curl --include --request OPTIONS \
  --header 'Origin: http://localhost:5173' \
  --header 'Access-Control-Request-Method: GET' \
  http://localhost:8000/app-be/v1/users
```

## Modificare i mock

Ogni JSON in `app-be/` definisce una coppia metodo/path univoca:

```json
{
  "request": {
    "method": "GET",
    "path": "/v1/example"
  },
  "response": {
    "status": 200,
    "headers": {
      "Cache-Control": "no-store"
    },
    "body": {
      "message": "example"
    }
  }
}
```

La configurazione viene validata e caricata una volta all'avvio. Dopo una
modifica:

```sh
docker compose restart app-be
```

Campi sconosciuti, JSON non valido, route duplicate o incomplete fanno
terminare il backend; controlla i log con `docker compose logs app-be`.

## Sicurezza e robustezza

- i container girano non-root, con filesystem read-only, capability rimosse e
  `no-new-privileges`;
- soltanto `8000/tcp` viene pubblicata;
- i mock sono montati read-only;
- ogni servizio ha un health check e NGINX viene avviato solo dopo che gli
  upstream risultano healthy;
- le immagini hanno versioni esplicite, senza `latest`;
- il frontend invia header di sicurezza e non inserisce dati API come HTML.

Questo è un ambiente dimostrativo HTTP senza autenticazione, TLS o rate
limiting. Non esporlo su reti non fidate e non inserire dati sensibili nei
mock.

## Validazione

```sh
find app-be -name '*.json' -print0 | xargs -0 -n1 jq --exit-status empty
docker compose config --quiet
docker compose build
docker compose up --wait
docker compose ps
```

La GitHub Action in `.github/workflows/validate.yml`, modellata
sull'esempio gemello con Caddy, valida i JSON e il modello Compose, avvia lo
stack e verifica route, errori HTTP e preflight CORS. Dependabot controlla
immagini Compose, Dockerfile e GitHub Actions ogni sei mesi usando
`semiannually`, intervallo supportato direttamente da GitHub.

Il reverse proxy conserva `default.conf.template` come template sorgente.
All'avvio, l'entrypoint ufficiale NGINX sostituisce `CORS_ORIGIN` e genera
automaticamente `/tmp/default.conf`; `nginx.conf` include i file `.conf`
presenti in `/tmp`. Non è quindi necessaria alcuna rinomina manuale.

## Troubleshooting

**La porta 8000 è occupata:** modifica temporaneamente il mapping in
`compose.yaml`, per esempio `8088:8080`, e usa `http://localhost:8088`.

**Un container è unhealthy o termina:** esegui `docker compose ps` e
`docker compose logs <servizio>`. Per il backend, controlla in particolare
schema JSON e unicità delle route.

**Dopo una modifica non cambia nulla:** ricostruisci frontend o proxy con
`docker compose up --build --detach`; per i soli JSON riavvia `app-be`.

**Il browser segnala CORS:** nell'app inclusa usa sempre il percorso relativo.
Per un server di sviluppo esterno, verifica che il suo origin corrisponda
esattamente a `CORS_ORIGIN` e ricrea `nginx`.

**Download GHCR negato:** la versione 1.0.0 è pubblica; verifica con
`docker pull ghcr.io/fvlgnn/go-mock-api-server:1.0.0` e controlla proxy,
firewall o credenziali Docker locali.

## License

Distribuito con licenza [MIT](LICENSE).
