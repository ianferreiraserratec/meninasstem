# Contexto do Projeto — Meninas STEM

## Projeto

Este repositório faz parte do projeto Meninas STEM – Petrópolis Tech Hub.

Ian atua no Núcleo 5 — Monitoramento.

O objetivo deste núcleo é estruturar, registrar, acompanhar e analisar os dados operacionais e indicadores do projeto, utilizando principalmente:

- Google Sheets
- Google Apps Script
- dashboards internos
- formulários e instrumentos de pesquisa
- bases normalizadas de pessoas, candidaturas, vínculos, ciclos e respostas

O sistema deve priorizar simplicidade operacional, rastreabilidade e integridade histórica.

---

# Estado atual da migração

A migração principal de pessoas, candidaturas e vínculos já foi concluída e validada.

Resultados finais:

- 109 pessoas únicas
- 113 candidaturas
- 57 vínculos no projeto
- 57 candidaturas associadas aos vínculos
- 0 erros de integridade
- 0 atenções na auditoria final

As tabelas atuais são:

## dim_pessoas_nova

Uma linha por pessoa.

Chave:

id_pessoa

Formato:

PES_UUID

Exemplo:

PES_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

Uma pessoa pode possuir várias candidaturas e vários vínculos históricos.

Nunca criar uma nova pessoa apenas porque há uma nova candidatura ou uma nova resposta de pesquisa.

---

## fato_candidaturas_nova

Uma linha por candidatura ao projeto.

Chave:

id_candidatura

Formato:

CAN_UUID

Relacionamento:

id_pessoa -> dim_pessoas_nova.id_pessoa

Uma pessoa pode possuir mais de uma candidatura, inclusive no mesmo ciclo.

Candidaturas duplicadas historicamente não devem ser apagadas automaticamente.

Status utilizados incluem:

INSCRITA
SELECIONADA
MATRICULADA
LISTA_DE_ESPERA
NAO_SELECIONADA
DESISTIU

Uma candidatura não precisa gerar vínculo.

---

## fato_vinculos_projeto_nova

Uma linha por participação efetiva da pessoa no projeto.

Chave:

id_vinculo_projeto

Formato:

VINP_UUID

Relacionamentos:

id_pessoa -> dim_pessoas_nova.id_pessoa

id_candidatura -> fato_candidaturas_nova.id_candidatura

O campo id_candidatura pode ser vazio quando a entrada no projeto não ocorreu via processo seletivo.

status_vinculo possui somente:

ATIVO
INATIVO

status_final é separado e pode possuir:

Certificação
Desligamento
Evasão
Reprovação

Não misturar status_vinculo com status_final.

Não preencher datas históricas artificialmente.

---

# Perfis de atuação

Perfis atualmente utilizados:

ALUNA
INSTRUTORA_PROGRAMACAO
ORIENTADORA

Grupos históricos:

AluProg -> ALUNA
ProfProg -> INSTRUTORA_PROGRAMACAO
OrientProg -> ORIENTADORA

Importante:

ICJ, IC e AT-NS são categorias de bolsa/formulário e não devem ser usadas automaticamente como perfil de atuação.

Nem toda aluna é bolsista ICJ.

---

# Identidade das pessoas

Nunca utilizar CPF como chave primária.

A chave oficial é id_pessoa com UUID.

CPF pode ser utilizado como atributo de identificação e apoio à resolução de identidade.

Durante migrações históricas:

- preservar candidaturas repetidas
- preservar vínculos existentes
- não unificar pessoas apenas pelo nome sem evidência
- quando uma identidade for confirmada, todas as candidaturas devem apontar para o mesmo id_pessoa
- aproveitar dados pessoais disponíveis nas diferentes fontes sem sobrescrever dados conflitantes automaticamente

---

# Tabelas auxiliares da migração

As seguintes tabelas ainda podem ser usadas para rastreabilidade:

_map_migracao_ids
_ponte_candidaturas_migracao

_map_migracao_ids contém correspondência entre IDs históricos e novos UUIDs.

_ponte_candidaturas_migracao liga candidaturas novas aos formulários e IDs de inscrição originais.

Não remover essas tabelas enquanto houver dados históricos a migrar.

---

# Próxima etapa

A próxima missão é revisar e migrar o sistema de pesquisas, instrumentos e respostas.

Já existem scripts no repositório relacionados a pesquisas.

Antes de modificar qualquer código:

1. inspecionar todos os arquivos existentes
2. identificar como pesquisas, perguntas e respostas estão modeladas hoje
3. identificar dependências com IDs antigos
4. verificar quais tabelas e scripts ainda usam nomes, CPF ou IDs antigos
5. propor uma arquitetura de migração antes de alterar dados

---

# Arquitetura prevista para pesquisas

Já existem ou podem existir tabelas como:

dim_pesquisas
dim_perguntas
fato_respostas_pesquisa

O modelo desejado deve separar:

- instrumento/pesquisa
- pergunta
- aplicação do instrumento
- resposta

É desejável possuir uma entidade equivalente a:

fato_aplicacoes_instrumentos

Essa tabela deve permitir relacionar:

id_pessoa
id_vinculo_projeto
id_ciclo
id_pesquisa
data_aplicacao

As respostas devem apontar para a aplicação e para a pergunta.

---

# Regra crítica para pesquisas

Uma pesquisa interna NÃO deve criar automaticamente uma nova pessoa.

Se uma resposta não puder ser associada de forma segura a uma pessoa existente:

- não criar novo id_pessoa
- registrar como pendência
- solicitar resolução manual

Métodos preferenciais de identificação:

1. id_pessoa
2. token único
3. CPF quando apropriado
4. combinação de atributos confiáveis

Evitar correspondência apenas por nome.

---

# Questionários e linha de base

Os questionários podem possuir perguntas diferentes conforme o perfil:

- aluna
- instrutora
- orientadora

Dados pessoais permanentes devem preferencialmente ficar em dim_pessoas.

Respostas contextuais, socioeconômicas, acadêmicas ou de avaliação devem permanecer nas tabelas de instrumentos e respostas.

Não transformar todas as perguntas de formulário em colunas de dim_pessoas.

---

# Clubes de Ciências

A arquitetura prevista é separada do vínculo principal do projeto.

Possíveis tabelas:

dim_clubes
fato_vinculos_clube

Prefixo de vínculo de clube:

VINCC_

Os clubes podem possuir:

- participantes do Meninas STEM
- estudantes externos

O vínculo de clube não deve ser confundido com fato_vinculos_projeto.

---

# Ciclos

Os dados devem ser organizados por ciclo anual.

Sempre preservar id_ciclo explicitamente nas tabelas de fatos relevantes.

Ao associar candidatura e vínculo, conferir sempre:

id_pessoa
id_ciclo

Não associar registros apenas porque pertencem à mesma pessoa.

---

# Princípios de desenvolvimento

Antes de fazer alterações destrutivas:

- criar backup
- trabalhar de forma idempotente quando possível
- gerar logs
- validar contagens antes e depois
- validar integridade referencial
- não apagar histórico

Ao migrar dados:

- preservar quantidade de registros históricos
- não inventar informações
- não preencher datas ou status sem evidência
- gerar pendências para casos ambíguos

Scripts devem ser claros, comentados e preferencialmente executáveis de forma independente.

---

# Forma de trabalho desejada

Trabalhar de forma incremental.

Antes de escrever uma grande migração:

1. entender a estrutura atual
2. explicar o diagnóstico
3. definir a arquitetura
4. executar pequenas validações
5. migrar
6. auditar
7. só depois limpar tabelas antigas

Evitar gerar várias versões redundantes de tabelas sem necessidade.

O usuário prefere scripts completos e prontos para copiar e executar.

---

# Situação atual

A etapa de identidade, candidaturas e vínculos está encerrada e validada.

Próxima tarefa:

REVISAR OS SCRIPTS EXISTENTES DE PESQUISAS NO REPOSITÓRIO E PLANEJAR A MIGRAÇÃO PARA O NOVO MODELO DE IDs.