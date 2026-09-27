# Mapa Nova Mulher — protótipo

Protótipo inicial de cartografia objetiva da rede de apoio no entorno da ONG Nova Mulher.

## O que já funciona

- mapa interativo com MapLibre GL JS;
- ONG Nova Mulher em destaque;
- área inicial de estudo de 3 km;
- máscara visual fora da área;
- filtros por categoria;
- marcadores clicáveis;
- painel de detalhes;
- layout responsivo para celular;
- estrutura pronta para GitHub Pages.

## Estrutura

```text
nova-mulher-mapa/
├── index.html
├── css/
│   └── style.css
├── js/
│   └── map.js
├── data/
│   └── locais.geojson
└── README.md
```

## Como executar localmente

Como o projeto carrega o arquivo `locais.geojson` via `fetch`, evite abrir `index.html`
diretamente com duplo clique (`file://`).

Se tiver Python instalado:

```bash
cd nova-mulher-mapa
python -m http.server 8000
```

Depois acesse:

```text
http://localhost:8000
```

Outra opção é usar a extensão **Live Server** no VS Code.

## Como adicionar um local

Edite `data/locais.geojson` e acrescente uma nova `Feature`:

```json
{
  "type": "Feature",
  "properties": {
    "kind": "service",
    "name": "Nome do serviço",
    "category": "saude",
    "address": "Endereço",
    "hours": "Horário",
    "contact": "Telefone",
    "description": "Como este serviço pode ajudar."
  },
  "geometry": {
    "type": "Point",
    "coordinates": [-46.66, -23.47]
  }
}
```

Categorias aceitas no protótipo:

- `apoio_mulher`
- `saude`
- `seguranca`
- `assistencia`
- `saude_mental`

## Importante sobre os dados

As coordenadas desta versão são **provisórias**, baseadas em CEP/logradouro para permitir
validação visual da interface. Antes da publicação final, deve-se validar a posição exata de
cada número/endereço e revisar horários e contatos.

## GitHub Pages

O projeto não exige build. Basta publicar a raiz da branch principal usando GitHub Pages.
Veja as instruções fornecidas junto ao protótipo.
