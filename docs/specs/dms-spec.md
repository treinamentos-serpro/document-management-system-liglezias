# Especificação - Document Management System

## 1. Objetivo

Permitir que usuários enviem, consultem e baixem documentos, mantendo os arquivos no filesystem local da aplicação e os metadados em memória.

## 2. Escopo

### Dentro do escopo

- Upload de um documento por requisição.
- Listagem dos documentos associados a um identificador de usuário.
- Download de documento pelo identificador.
- Interface web para upload, listagem e download.
- Isolamento de listagem e download por identificador de usuário.

### Fora do escopo

- Armazenamento externo ou em nuvem.
- Persistência durável dos metadados.
- Autenticação formal, gestão de credenciais e controle de acesso robusto.
- Versionamento, exclusão, compartilhamento, busca avançada ou upload em lote.

## 3. Requisitos funcionais

| ID | Requisito |
| --- | --- |
| RF-01 | O usuário pode enviar um arquivo pelo campo multipart `file`. |
| RF-02 | Upload, listagem e download exigem o cabeçalho `X-User-Id`. |
| RF-03 | O sistema gera um identificador UUID e registra nome original, tamanho, data de upload e dono do documento. |
| RF-04 | O conteúdo é gravado localmente usando `multer` com `diskStorage` e nome físico gerado pelo sistema. |
| RF-05 | O usuário pode listar os metadados dos documentos associados ao seu identificador. |
| RF-06 | O usuário pode baixar um documento pelo ID se ele estiver associado ao identificador informado. |
| RF-07 | O sistema retorna erros apropriados para usuário inválido, arquivo ausente, arquivo inválido, limite excedido e documento inexistente ou não autorizado. |
| RF-08 | O nome original é preservado como metadado e nome sugerido no download, mas não é usado como caminho local. |
| RF-09 | A interface permite selecionar o identificador de usuário, enviar arquivo, atualizar a lista e baixar um documento. |
| RF-10 | A interface apresenta estados de carregamento, lista vazia, sucesso e erro. |

## 4. Requisitos não funcionais

| ID | Requisito |
| --- | --- |
| RNF-01 | Os arquivos são armazenados exclusivamente no filesystem local, por padrão em `backend/storage`. |
| RNF-02 | Os metadados ficam em memória e podem ser perdidos quando o processo reiniciar. |
| RNF-03 | Configurações usam variáveis de ambiente: `PORT`, `STORAGE_DIR` e `MAX_FILE_SIZE_BYTES`. |
| RNF-04 | O backend usa Node.js, Express e CommonJS; testes usam `node:test`. |
| RNF-05 | O frontend usa React e Vite, com requisições via `fetch` e prefixo `/api`. |
| RNF-06 | O backend respeita as camadas `routes -> controllers -> services -> repositories`. |
| RNF-07 | Entradas HTTP, erros de filesystem e erros de upload são tratados sem expor stack traces ou caminhos locais. |
| RNF-08 | `X-User-Id` é uma associação de protótipo e não comprova a identidade do usuário. O sistema não deve ser exposto como serviço multiusuário público sem autenticação. |

### Limites e validações

- O tamanho máximo padrão é 10 MiB; pode ser alterado por `MAX_FILE_SIZE_BYTES`.
- Arquivos vazios não são aceitos.
- O identificador do usuário deve conter de 1 a 128 caracteres após remoção de espaços nas extremidades.
- O identificador de documento é um UUID.
- O MVP não faz allowlist de extensão ou MIME type e não interpreta o conteúdo enviado.
- A pasta de armazenamento é criada quando necessária.

## 5. Modelo de dados

### Metadados públicos do documento

| Campo | Tipo | Descrição |
| --- | --- | --- |
| `id` | string | UUID do documento e nome físico gerado para o arquivo local. |
| `originalName` | string | Nome original fornecido pelo cliente, usado como metadado e nome de download. |
| `size` | number | Tamanho do arquivo em bytes. |
| `uploadedAt` | string | Data e hora do upload em ISO 8601 UTC. |
| `owner` | string | Identificador recebido em `X-User-Id`. |

O repositório guarda os registros em memória, indexados por `id`. O nome físico é gerado como UUID sem extensão; nomes originais e caminhos absolutos não são usados para localizar o arquivo nem expostos em respostas.

## 6. Contratos de API

### Convenções

- Rotas do backend não incluem prefixo: `/upload`, `/documents` e `/documents/:id/download`.
- O frontend usa `/api`; o proxy do Vite remove o prefixo ao encaminhar ao backend.
- Operações sobre documentos exigem `X-User-Id`.
- Erros JSON seguem o formato `{"error":{"code":"CODIGO","message":"Descrição"}}`.

### `POST /upload`

- Cabeçalho: `X-User-Id: <identificador>`.
- Entrada: `multipart/form-data`, campo `file`, um arquivo.
- Sucesso: `201 Created`, JSON `{ "document": { "id", "originalName", "size", "uploadedAt", "owner" } }`.
- Erros: `400` (`INVALID_USER_ID`, `FILE_REQUIRED`, `INVALID_FILE`), `413` (`FILE_TOO_LARGE`) e `500` (`INTERNAL_ERROR`).
- Se o arquivo for vazio, é removido do disco e nenhum metadado é registrado.

### `GET /documents`

- Cabeçalho: `X-User-Id: <identificador>`.
- Sucesso: `200 OK`, JSON `{ "documents": [...] }`, ordenado do mais recente para o mais antigo.
- Usuário sem documentos recebe `200 OK` e lista vazia.
- Erros: `400` (`INVALID_USER_ID`) e `500` (`INTERNAL_ERROR`).

### `GET /documents/:id/download`

- Cabeçalho: `X-User-Id: <identificador>`.
- Sucesso: `200 OK`, conteúdo binário, `Content-Type: application/octet-stream` e `Content-Disposition: attachment` com nome original sanitizado.
- Erros: `400` (`INVALID_USER_ID`, `INVALID_DOCUMENT_ID`), `404` (`DOCUMENT_NOT_FOUND`, inclusive para documento associado a outro usuário) e `500` (`INTERNAL_ERROR`).

## 7. Decisões arquiteturais

- `routes` definem os endpoints e configuram o middleware de upload.
- `controllers` validam e traduzem HTTP para chamadas do serviço; formatam respostas e downloads.
- `services` aplicam as regras de negócio e projetam metadados públicos.
- `repositories` isolam o mapa em memória, filesystem local e resolução de caminhos.
- A camada de serviço não depende de Express.
- `multer.diskStorage` grava no diretório local configurável; não há serviço de armazenamento externo.
- O frontend separa a página, componentes reutilizáveis e serviço `fetch`.
- Reiniciar o backend perde os metadados; arquivos podem permanecer órfãos no disco. Persistência e reconciliação ficam fora desta versão.

## 8. Plano de execução

1. Registrar esta especificação a partir de `spec-template.md` e alinhar requisitos, modelo e contratos.
2. Implementar repositório de documentos com armazenamento local via `multer.diskStorage` e metadados em memória.
3. Implementar casos de uso e endpoints de upload, listagem e download nas camadas de serviço, controller e routes.
4. Construir a interface React com seleção de usuário, envio, listagem, download e estados de erro/vazio/carregamento.
5. Validar integração por testes HTTP do backend e build de produção do frontend.

## 9. Critérios de aceite e riscos

- Upload retorna os metadados públicos e grava o arquivo apenas no armazenamento local.
- Listagem e download respeitam o `X-User-Id`; documentos de outro usuário não são listados nem baixados.
- Limite de tamanho, arquivo vazio e ausência de arquivo produzem os status e códigos definidos.
- Metadados não incluem caminho absoluto ou nome físico interno.
- Testes do backend e build do frontend concluem sem erros.
- Como o identificador não é autenticado e os metadados são voláteis, esta implementação é adequada apenas ao protótipo/ambiente controlado.