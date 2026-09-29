---
description: Revisa a ortografia de textos em português presentes no código.
name: revisao-portugues
argument-hint: caminho opcional para revisar (ex. frontend/src ou backend/src)
agent: agent
---

# Revisar ortografia em português

Revise a ortografia dos textos em português no código do projeto${input:caminho:}, incluindo mensagens exibidas ao usuário, comentários e textos de interface.

Requisitos:

- Corrija ortografia, acentuação, concordância e pontuação quando necessário.
- Preserve o significado, o tom e o idioma definido pelo projeto.
- Não altere nomes de variáveis, funções, classes, rotas, códigos de erro,
  identificadores, chaves JSON, comandos ou contratos de API.
- Não modifique strings técnicas, nomes próprios, URLs, valores de configuração
  ou conteúdo que precise permanecer literal para a aplicação funcionar.
- Mantenha a formatação, a indentação e o estilo dos arquivos existentes.
- Não faça refatorações nem alterações de comportamento não relacionadas à
  revisão ortográfica.
- Procure também erros comuns de digitação em mensagens com interpolação e
  strings multilinha, sem quebrar placeholders ou expressões de template.
- Ao finalizar, liste os arquivos alterados e resuma as correções realizadas.
- Se não encontrar erros, informe que nenhuma alteração foi necessária.