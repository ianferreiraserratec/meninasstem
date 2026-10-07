function atualizarDimPerguntas(idPesquisa) {
  var pesquisa = buscarPesquisaPorId(idPesquisa);
  var perguntas = [];

  try {
    validarPesquisaParaAtualizarPerguntas(pesquisa);

    var form = abrirFormulario(pesquisa.forms_id);
    perguntas = extrairPerguntasDoForms(form);

    sincronizarDimPerguntas(idPesquisa, perguntas);

    registrarLogProcessamento({
      data_hora_execucao: new Date(),
      acao: 'atualizar_perguntas',
      id_pesquisa: idPesquisa,
      qtd_perguntas_lidas: perguntas.length,
      qtd_respostas_forms: 0,
      qtd_linhas_geradas: 0,
      qtd_nao_encontrados: 0,
      qtd_ambiguidades: 0,
      status_execucao: 'sucesso',
      mensagem_resumo: 'dim_perguntas atualizada com sucesso.'
    });

    return 'dim_perguntas atualizada com sucesso para a pesquisa: ' + idPesquisa;

  } catch (e) {
    registrarLogProcessamento({
      data_hora_execucao: new Date(),
      acao: 'atualizar_perguntas',
      id_pesquisa: idPesquisa,
      qtd_perguntas_lidas: perguntas.length,
      qtd_respostas_forms: 0,
      qtd_linhas_geradas: 0,
      qtd_nao_encontrados: 0,
      qtd_ambiguidades: 0,
      status_execucao: 'erro',
      mensagem_resumo: e.message
    });

    throw e;
  }
}

function buscarPesquisaPorId(idPesquisa) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var aba = ss.getSheetByName('dim_pesquisas');

  if (!aba) {
    throw new Error('A aba "dim_pesquisas" não foi encontrada.');
  }

  var dados = aba.getDataRange().getValues();

  if (dados.length < 2) {
    throw new Error('A aba "dim_pesquisas" não possui dados.');
  }

  var cabecalhos = dados[0];

  var idxIdPesquisa = cabecalhos.indexOf('id_pesquisa');
  if (idxIdPesquisa === -1) {
    throw new Error('A coluna "id_pesquisa" não foi encontrada em "dim_pesquisas".');
  }

  for (var i = 1; i < dados.length; i++) {
    var linha = dados[i];
    var valorId = String(linha[idxIdPesquisa] || '').trim();

    if (valorId === String(idPesquisa).trim()) {
      var registro = {};

      for (var j = 0; j < cabecalhos.length; j++) {
        registro[cabecalhos[j]] = linha[j];
      }

      return registro;
    }
  }

  throw new Error('Pesquisa não encontrada: ' + idPesquisa);
}

function abrirFormulario(formsId) {
  try {
    return FormApp.openById(formsId);
  } catch (e) {
    throw new Error('Erro ao abrir o formulário. Verifique o forms_id.\n\n' + e.message);
  }
}

function extrairPerguntasDoForms(form) {
  var itens = form.getItems();

  var perguntas = [];
  var ordem = 1;

  itens.forEach(function(item) {
    var tipo = item.getType();

    // Ignorar itens que não são perguntas
    var tiposValidos = [
      FormApp.ItemType.TEXT,
      FormApp.ItemType.PARAGRAPH_TEXT,
      FormApp.ItemType.MULTIPLE_CHOICE,
      FormApp.ItemType.CHECKBOX,
      FormApp.ItemType.LIST,
      FormApp.ItemType.SCALE
    ];

    if (tiposValidos.indexOf(tipo) === -1) {
      return;
    }

    var texto = item.getTitle() || '';
    var descricao = item.getHelpText() || '';

    var obrigatoria = false;

    try {
      obrigatoria = item.isRequired();
    } catch (e) {
      obrigatoria = false;
    }

    var tipoResposta = mapearTipoRespostaForms(tipo);

    perguntas.push({
      texto_pergunta: texto,
      descricao_pergunta: descricao,
      tipo_resposta: tipoResposta,
      obrigatoria: obrigatoria,
      ordem_pergunta: ordem
    });

    ordem++;
  });

  return perguntas;
}

function mapearTipoRespostaForms(tipo) {
  switch (tipo) {
    case FormApp.ItemType.TEXT:
    case FormApp.ItemType.PARAGRAPH_TEXT:
      return 'texto';

    case FormApp.ItemType.MULTIPLE_CHOICE:
    case FormApp.ItemType.LIST:
      return 'opcao_unica';

    case FormApp.ItemType.CHECKBOX:
      return 'multipla_selecao';

    case FormApp.ItemType.SCALE:
      return 'escala';

    default:
      return 'texto';
  }
}

function lerDimPerguntasPorPesquisa(idPesquisa) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var aba = ss.getSheetByName('dim_perguntas');

  if (!aba) {
    throw new Error('A aba "dim_perguntas" não foi encontrada.');
  }

  var dados = aba.getDataRange().getValues();
  var cabecalhos = dados[0];

  var idxPesquisa = cabecalhos.indexOf('id_pesquisa');
  var idxTexto = cabecalhos.indexOf('texto_pergunta');

  var resultado = [];

  for (var i = 1; i < dados.length; i++) {
    var linha = dados[i];

    if (linha[idxPesquisa] === idPesquisa) {
      resultado.push({
        linhaIndex: i + 1,
        texto_pergunta: linha[idxTexto],
        dados: linha
      });
    }
  }

  return {
    cabecalhos: cabecalhos,
    registros: resultado
  };
}

function sincronizarDimPerguntas(idPesquisa, perguntasForms) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var aba = ss.getSheetByName('dim_perguntas');

  var estrutura = lerDimPerguntasPorPesquisa(idPesquisa);
  var cab = estrutura.cabecalhos;
  var existentes = estrutura.registros;

  var mapaExistentes = {};

  existentes.forEach(function(p) {
    mapaExistentes[p.texto_pergunta] = p;
  });

  var idx = {};
  cab.forEach(function(col, i) {
    idx[col] = i;
  });

  var perguntasProcessadas = {};

  perguntasForms.forEach(function(p, i) {
    var texto = p.texto_pergunta;
    perguntasProcessadas[texto] = true;

    if (mapaExistentes[texto]) {
      // Atualizar
      var linha = mapaExistentes[texto].linhaIndex;

      aba.getRange(linha, idx['descricao_pergunta'] + 1).setValue(p.descricao_pergunta);
      aba.getRange(linha, idx['tipo_resposta'] + 1).setValue(p.tipo_resposta);
      aba.getRange(linha, idx['ordem_pergunta'] + 1).setValue(p.ordem_pergunta);
      aba.getRange(linha, idx['obrigatoria'] + 1).setValue(p.obrigatoria);
      aba.getRange(linha, idx['ativo'] + 1).setValue(true);

    } else {
      // Inserir novo
      var novaLinha = new Array(cab.length).fill('');

      novaLinha[idx['id_pergunta']] = idPesquisa + '__Q' + String(p.ordem_pergunta).padStart(2, '0');
      novaLinha[idx['id_pesquisa']] = idPesquisa;
      novaLinha[idx['texto_pergunta']] = p.texto_pergunta;
      novaLinha[idx['descricao_pergunta']] = p.descricao_pergunta;
      novaLinha[idx['tipo_resposta']] = p.tipo_resposta;
      novaLinha[idx['ordem_pergunta']] = p.ordem_pergunta;
      novaLinha[idx['obrigatoria']] = p.obrigatoria;
      novaLinha[idx['ativo']] = true;

      aba.appendRow(novaLinha);
    }
  });

  // Inativar perguntas removidas
  existentes.forEach(function(p) {
    if (!perguntasProcessadas[p.texto_pergunta]) {
      aba.getRange(p.linhaIndex, idx['ativo'] + 1).setValue(false);
    }
  });
}