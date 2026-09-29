# Quality Playbook - Phase 1 Exploration

## Contexto do sistema

O DMS é um protótipo web com backend Node.js/Express CommonJS e frontend
React/Vite ESM. O backend grava arquivos no filesystem local por meio de
`multer.diskStorage` e conserva metadados em um `Map`; o frontend usa `fetch`
com o prefixo `/api` e o proxy Vite remove esse prefixo. A especificação
formal é `docs/specs/dms-spec.md:1-131`, com requisitos RF-01 a RF-10 e
RNF-01 a RNF-08. O inventário foi obtido por `git ls-files`, sem incluir
dependências, artefatos de build ou a skill instalada em `.github/skills`.

## Open Exploration Findings

1. A montagem do sistema conecta Express ao router de documentos em
   `backend/src/app.js:13-23`, enquanto `backend/src/routes/documents.routes.js:66-97`
   instala o middleware multer e os três endpoints. Essa composição implementa
   RF-01, RF-04 e RNF-06, mas faz a configuração de upload parte da camada de
   rotas, portanto qualquer falha de destino ocorre antes do controller.

2. A identidade é validada no controller em
   `backend/src/controllers/documents.controller.js:103-115` e propagada para
   o serviço em `backend/src/controllers/documents.controller.js:117-132`.
   O repositório filtra pelo mesmo valor em
   `backend/src/repositories/documents.repository.js:20-31`, sustentando o
   isolamento descrito em `docs/specs/dms-spec.md:28-37`.

3. O upload cria o registro público no serviço em
   `backend/src/services/documents.service.js:178-202`, mas o arquivo já foi
   criado pelo multer em `backend/src/routes/documents.routes.js:77-89`.
   O caminho de sucesso e o caminho de arquivo vazio limpam em
   `documents.service.js:183-186` e o caminho de exceção do repositório limpa
   em `documents.service.js:197-202`; a revisão deve confirmar também falhas
   de transporte e limites do multer.

4. A proteção de caminho está dividida entre a validação UUID do controller em
   `backend/src/controllers/documents.controller.js:134-141` e a validação de
   basename do repositório em `backend/src/repositories/documents.repository.js:39-45`.
   A dupla barreira impede que `originalName` seja usado como caminho, conforme
   RF-08 e `docs/specs/dms-spec.md:67-73`, mas merece testes para nomes com
   barras, controles e aspas.

5. A listagem é ordenada no repositório por `uploadedAt` em
   `backend/src/repositories/documents.repository.js:20-25`, convertida para
   metadado público pelo serviço em `backend/src/services/documents.service.js:173-176`
   e entregue pelo controller em `backend/src/controllers/documents.controller.js:126-131`.
   O teste atual verifica apenas um item em `backend/test/app.test.js:189-198`,
   deixando a ordenação de múltiplos documentos como lacuna de cobertura.

6. O cliente frontend mantém o contrato `/api` em
   `frontend/src/services/documentApi.js:1-41`, enquanto o proxy reescreve para
   as rotas sem prefixo em `frontend/vite.config.js:7-16`. A tela carrega a lista
   em `frontend/src/App.jsx:21-40` e renderiza o resultado em
   `frontend/src/App.jsx:136-154`; uma falha de proxy aparece como erro de
   requisição, mas um erro de renderização após a resposta pode desmontar a UI.

7. O fluxo de download cruza quatro superfícies: `DocumentList` passa o item
   para `DownloadButton` em `frontend/src/components/DocumentList.jsx:191-202`,
   `App` cria o blob em `frontend/src/App.jsx:72-87`, o cliente faz a chamada em
   `frontend/src/services/documentApi.js:31-41` e o controller sanitiza o nome
   em `backend/src/controllers/documents.controller.js:143-156`. A cadeia está
   coerente no estado atual, mas qualquer alteração no shape do documento pode
   quebrar a ação depois da listagem.

8. A UI inicializa o usuário do `localStorage` em `frontend/src/App.jsx:11-19`,
   envia o valor no cabeçalho pelo cliente em `frontend/src/services/documentApi.js:12-14`
   e permite trocar o usuário em `frontend/src/App.jsx:42-53`. O backend normaliza
   espaços nas extremidades em `backend/src/controllers/documents.controller.js:103-114`;
   portanto o valor exibido pode manter espaços enquanto o dono persistido não,
   um detalhe a cobrir quando se alternam usuários.

9. O tratamento global diferencia erro Multer, erro de domínio e `ENOENT` em
   `backend/src/app.js:25-57`, evitando stack trace e caminhos locais como exige
   RNF-07. Entretanto, o fallback de status transforma qualquer `ENOENT` em
   `DOCUMENT_NOT_FOUND`, mesmo quando a origem é uma falha de filesystem fora do
   download; a auditoria deve confirmar se esse mapeamento é aceitável.

10. O teste de integração configura armazenamento temporário e limite reduzido
    em `backend/test/app.test.js:138-156`, depois cobre usuário ausente, arquivo
    ausente, upload, isolamento, download, limite e arquivo vazio em
    `backend/test/app.test.js:169-219`. Não há teste automatizado do frontend,
    nem teste de reinício e arquivos órfãos, riscos explicitamente assumidos em
    `docs/specs/dms-spec.md:105-114`.

11. A implementação canônica foi introduzida com aliases legados: as rotas
    antigas reexportam em `backend/src/routes/documentRoutes.js:1`, o controller
    em `backend/src/controllers/documentController.js:1`, o serviço em
    `backend/src/services/documentService.js:1` e o repositório em
    `backend/src/repositories/documentRepository.js:1`. O mesmo padrão aparece
    no frontend em `frontend/src/components/UploadForm.jsx:1`. Isso reduz quebra
    de imports, mas cria duas superfícies de nome que devem permanecer
    equivalentes.

12. O build de produção do frontend e o teste HTTP do backend são os critérios
    de aceite documentados em `docs/specs/dms-spec.md:124-131`; as execuções
    observadas nesta sessão passaram. Ainda assim, o critério não substitui
    testes específicos para falhas de cleanup, mensagens e composição do proxy.

## Quality Risks

- O filesystem é externo ao `Map` em memória: reinicializações podem deixar
  arquivos órfãos, risco reconhecido em `docs/specs/dms-spec.md:105-114` e
  materializado pela separação entre `documents.repository.js:4-7` e o serviço.
- `X-User-Id` é associação, não autenticação; um cliente que conhece outro ID
  pode se passar por ele. Isso é explicitamente limitado em
  `docs/specs/dms-spec.md:49-50` e deve permanecer visível na documentação.
- O limite é configurável e aplicado pelo multer em
  `backend/src/routes/documents.routes.js:72-89`; alterações em env precisam
  preservar o fallback de 10 MiB e o status 413 definido em
  `backend/src/app.js:30-39`.
- Nomes fornecidos por clientes atravessam metadado, header e download em
  `backend/src/controllers/documents.controller.js:148-150`; sanitização e
  comportamento de nomes vazios/especiais são superfície de segurança.
- O frontend não tem teste de componente ou navegador; o bug recente de
  renderização no botão de download mostrou que `npm run build` sozinho não
  garante que o caminho pós-carregamento seja exercitado.
- O proxy `/api` só é definido no servidor Vite em
  `frontend/vite.config.js:7-16`; uma implantação que sirva o bundle sem proxy
  precisa fornecer o mesmo contrato no servidor de produção.

## Pattern Applicability Matrix

| Pattern | Decision | Reason |
| --- | --- | --- |
| Fallback and Degradation Path Parity | FULL | Upload, erro de limite, arquivo vazio e erro de persistência possuem caminhos distintos. |
| Dispatcher Return-Value Correctness | SKIP | Não há dispatcher de eventos ou máquina de estados; Express delega e retorna respostas diretamente. |
| Cross-Implementation Contract Consistency | SKIP | Não há múltiplos backends, transportes ou implementações do mesmo protocolo. |
| Enumeration and Representation Completeness | SKIP | Não há whitelist, enum ou registry fechado controlando documentos. |
| API Surface Consistency | FULL | Aliases legados, componentes e cliente expõem operações equivalentes. |
| Spec-Structured Parsing Fidelity | SKIP | O sistema valida UUID, tamanho e cabeçalhos simples, sem parser de gramática formal. |
| Composition and Mount-Context Awareness | FULL | O frontend compõe `/api` com proxy e backend monta rotas na raiz. |

## Pattern Deep Dive — Fallback and Degradation Path Parity

- **Upload normal:** `documents.routes.js:77-89` grava no diretório e gera nome
  físico; `documents.service.js:188-198` cria o metadado somente após a chegada
  do arquivo.
- **Arquivo vazio:** `documents.service.js:183-186` remove o arquivo e retorna
  erro 400; o contrato correspondente está em `dms-spec.md:84-90`.
- **Falha ao persistir metadado:** `documents.service.js:197-202` tenta remover
  o arquivo antes de relançar a exceção; já falhas do middleware passam por
  `app.js:30-39`. A paridade a verificar é se limite, erro de destino e erro de
  repositório deixam o mesmo estado: nenhum metadado e nenhum arquivo parcial.
- **Candidato:** REQ-011: todo caminho de upload que falhar após criar um arquivo
  deve remover o arquivo físico parcial e responder sem caminho local.

## Pattern Deep Dive — API Surface Consistency

- O caminho canônico do upload é `UploadComponent` em
  `frontend/src/components/UploadComponent.jsx:3-34`; o alias público
  `UploadForm` em `frontend/src/components/UploadForm.jsx:1` deve preservar o
  mesmo comportamento de limpar o input apenas após sucesso.
- O botão é usado pela lista em `frontend/src/components/DocumentList.jsx:197-202`
  e a ação real vive no `App` em `frontend/src/App.jsx:72-87`; o cliente retorna
  um `Blob` em `frontend/src/services/documentApi.js:31-41`. A superfície
  composta precisa manter `disabled`, estado de carregamento, nome original e
  tratamento de erro alinhados.
- Os módulos backend antigos reexportam os módulos canônicos em
  `backend/src/routes/documentRoutes.js:1`, `backend/src/services/documentService.js:1`
  e `backend/src/repositories/documentRepository.js:1`. Imports legados e
  imports novos devem produzir as mesmas referências e contratos.
- **Candidato:** REQ-012: aliases de compatibilidade e componentes reutilizáveis
  devem preservar o mesmo contrato observável das implementações canônicas.

## Pattern Deep Dive — Composition and Mount-Context Awareness

- O cliente usa caminho relativo `/api` em `frontend/src/services/documentApi.js:1-9`;
  o proxy Vite remove `/api` em `frontend/vite.config.js:10-14`; o backend monta
  o router na raiz em `backend/src/app.js:19-23`. O estado canônico do destino
  é, portanto, `/upload`, `/documents` e `/documents/:id/download`.
- Em desenvolvimento, `frontend/src/App.jsx:26-35` depende de o proxy encaminhar
  o cabeçalho `X-User-Id` ao middleware em `documents.controller.js:103-114`.
  Se o frontend for montado sob outro host ou sem o proxy, `/api/documents`
  pode retornar HTML/404 em vez do JSON esperado.
- O download também compõe URL codificada no cliente em
  `frontend/src/services/documentApi.js:33-38` com validação UUID no backend em
  `documents.controller.js:134-141`; o caminho externo e o caminho interno não
  devem ser confundidos.
- **Candidato:** REQ-013: toda implantação que servir o frontend deve fornecer
  um mount `/api` equivalente ao proxy de desenvolvimento, preservando headers,
  métodos, códigos e payloads do backend.

## Candidate Bugs for Phase 2

1. `Stage: open exploration + Fallback and Degradation Path Parity`  
   Falhas de upload em diferentes etapas podem deixar arquivos parciais ou
   órfãos; criar testes que comparem limite, arquivo vazio, erro de destino e
   erro de persistência.

2. `Stage: open exploration + API Surface Consistency`  
   O alias legado e a implementação canônica podem divergir silenciosamente
   após uma futura alteração; adicionar verificações de equivalência e de
   limpeza do input no upload.

3. `Stage: quality risks + Composition and Mount-Context Awareness`  
   Uma implantação sem o proxy `/api` de desenvolvimento pode produzir uma
   resposta não-JSON e deixar a interface sem dados; validar o contrato em
   ambiente de produção/preview.

4. `Stage: quality risks`  
   A ausência de testes de UI permite regressões de runtime após a listagem,
   como a referência inexistente que causou a tela branca anteriormente; incluir
   um teste que renderize lista vazia e lista com ação de download.

5. `Stage: open exploration`  
   A ordenação por data é uma regra contratual, mas o teste atual cobre somente
   um documento; testar múltiplos uploads com timestamps distintos e empate.

## Derived Requirements and Use Cases

### REQ-011 - Cleanup em falhas de upload

References: `backend/src/routes/documents.routes.js:77-89`,
`backend/src/services/documents.service.js:178-202`,
`backend/src/app.js:30-57`, `docs/specs/dms-spec.md:84-90`.
O sistema deve deixar nenhum metadado e nenhum arquivo parcial quando o upload
falhar após iniciar a gravação.

### REQ-012 - Equivalência de superfícies

References: `frontend/src/components/UploadComponent.jsx:3-34`,
`frontend/src/components/UploadForm.jsx:1`,
`backend/src/routes/documentRoutes.js:1`,
`backend/src/routes/documents.routes.js:66-97`.
Os aliases e implementações canônicas devem preservar o mesmo comportamento.

### REQ-013 - Mount de API

References: `frontend/src/services/documentApi.js:1-41`,
`frontend/vite.config.js:7-16`, `backend/src/app.js:19-23`,
`docs/specs/dms-spec.md:75-82`.
O ambiente que servir a interface deve encaminhar `/api` para os endpoints do
backend sem alterar headers ou payloads.

### UC-01 - Enviar documento

Actor: usuário identificado. Precondition: `X-User-Id` válido e arquivo
selecionado. Flow: UI envia multipart, multer grava, serviço registra e retorna
metadados. Postcondition: arquivo local e documento público associado ao dono.

### UC-02 - Listar documentos

Actor: usuário identificado. Flow: UI chama `/api/documents`, backend filtra,
ordena e retorna metadados. Postcondition: nenhum documento de outro usuário é
exibido.

### UC-03 - Baixar documento

Actor: usuário identificado. Flow: UI chama endpoint com ID codificado, backend
valida UUID e associação, depois envia o arquivo com nome sanitizado.

## Cartesian UC rule confirmation

1. Para cada REQ com duas ou mais referências, o Gate 1 de path-suffix match foi
   executado; os agrupamentos encontrados são aliases/superfícies, não
   implementações paralelas do mesmo algoritmo.
2. Para os agrupamentos que passaram no Gate 1, o Gate 2 de similaridade de
   função foi executado; aliases de uma linha não constituem sites funcionais
   equivalentes com corpos comparáveis.
3. Nenhum requisito teve Gate 1 e Gate 2 aprovados simultaneamente; portanto
   não foram emitidos UCs per-site `UC-N.a`.
4. Nenhum agrupamento passou apenas no Gate 1; não foi necessário marcar
   `<!-- cluster: heterogeneous -->`.
5. Os demais requisitos mantêm UCs umbrella, sem marcação especial.
6. Não há REQ com Pattern match de whitelist, parity ou compensation no Gate 1.

## Gate Self-Check

1. [x] O arquivo contém pelo menos 120 linhas.
2. [x] Contém os seis títulos obrigatórios da Fase 1.
3. [x] Contém três seções `Pattern Deep Dive` para padrões FULL.
4. [x] `quality/PROGRESS.md` existe.
5. [x] A linha da Fase 1 em `PROGRESS.md` está marcada `[x]`.
6. [x] Há pelo menos oito achados numerados com citações file:line.
7. [x] Há pelo menos três achados que citam locais em arquivos distintos.
8. [x] A matriz contém exatamente três padrões FULL.
9. [x] Pelo menos duas análises profundas traçam múltiplos símbolos ou locais.
10. [x] Os candidatos incluem fontes de open exploration/quality risks e deep dive.
11. [x] `quality/exploration_role_map.json` contém todos os arquivos de `git ls-files`.
12. [x] O mapa registra a proveniência obrigatória `git-ls-files`.
13. [x] A confirmação da regra cartesiana está registrada explicitamente.

Phase 1 result: PASS. Não foram feitas alterações fora de `quality/` nesta fase.