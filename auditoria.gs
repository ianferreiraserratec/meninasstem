function registrarLogProcessamento(log) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var aba = ss.getSheetByName('log_processamento_pesquisas');

  if (!aba) {
    throw new Error('A aba "log_processamento_pesquisas" não foi encontrada.');
  }

  var cabecalhos = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0];
  var idx = {};
  cabecalhos.forEach(function(coluna, i) {
    idx[coluna] = i;
  });

  var colunasObrigatorias = [
    'data_hora_execucao',
    'acao',
    'id_pesquisa',
    'qtd_perguntas_lidas',
    'qtd_respostas_forms',
    'qtd_linhas_geradas',
    'qtd_nao_encontrados',
    'qtd_ambiguidades',
    'status_execucao',
    'mensagem_resumo'
  ];

  colunasObrigatorias.forEach(function(coluna) {
    if (idx[coluna] === undefined) {
      throw new Error('A coluna "' + coluna + '" não foi encontrada em "log_processamento_pesquisas".');
    }
  });

  var linha = new Array(cabecalhos.length).fill('');

  linha[idx['data_hora_execucao']] = log.data_hora_execucao || new Date();
  linha[idx['acao']] = log.acao || '';
  linha[idx['id_pesquisa']] = log.id_pesquisa || '';
  linha[idx['qtd_perguntas_lidas']] = log.qtd_perguntas_lidas || 0;
  linha[idx['qtd_respostas_forms']] = log.qtd_respostas_forms || 0;
  linha[idx['qtd_linhas_geradas']] = log.qtd_linhas_geradas || 0;
  linha[idx['qtd_nao_encontrados']] = log.qtd_nao_encontrados || 0;
  linha[idx['qtd_ambiguidades']] = log.qtd_ambiguidades || 0;
  linha[idx['status_execucao']] = log.status_execucao || '';
  linha[idx['mensagem_resumo']] = log.mensagem_resumo || '';

  aba.appendRow(linha);
}

function registrarLogInconsistencias(inconsistencias) {
  if (!inconsistencias || inconsistencias.length === 0) {
    return;
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var aba = ss.getSheetByName('log_inconsistencias_pesquisas');

  if (!aba) {
    throw new Error('A aba "log_inconsistencias_pesquisas" não foi encontrada.');
  }

  var cabecalhos = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0];
  var idx = {};

  cabecalhos.forEach(function(coluna, i) {
    idx[coluna] = i;
  });

  var colunasObrigatorias = [
    'data_hora',
    'id_pesquisa',
    'tipo_inconsistencia',
    'nome_completo',
    'id_ciclo',
    'detalhe'
  ];

  colunasObrigatorias.forEach(function(coluna) {
    if (idx[coluna] === undefined) {
      throw new Error('A coluna "' + coluna + '" não foi encontrada em "log_inconsistencias_pesquisas".');
    }
  });

  var linhas = inconsistencias.map(function(item) {
    var linha = new Array(cabecalhos.length).fill('');

    linha[idx['data_hora']] = item.data_hora || new Date();
    linha[idx['id_pesquisa']] = item.id_pesquisa || '';
    linha[idx['tipo_inconsistencia']] = item.tipo_inconsistencia || '';
    linha[idx['nome_completo']] = item.nome_completo || '';
    linha[idx['id_ciclo']] = item.id_ciclo || '';
    linha[idx['detalhe']] = item.detalhe || '';

    return linha;
  });

  var startRow = aba.getLastRow() + 1;
  aba.getRange(startRow, 1, linhas.length, linhas[0].length).setValues(linhas);
}

function atualizarUltimaImportacaoPesquisa(idPesquisa, dataHora) {
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
  var idxUltimaImportacao = cabecalhos.indexOf('ultima_importacao_em');

  if (idxIdPesquisa === -1) {
    throw new Error('A coluna "id_pesquisa" não foi encontrada em "dim_pesquisas".');
  }

  if (idxUltimaImportacao === -1) {
    throw new Error('A coluna "ultima_importacao_em" não foi encontrada em "dim_pesquisas".');
  }

  for (var i = 1; i < dados.length; i++) {
    var valorId = String(dados[i][idxIdPesquisa] || '').trim();

    if (valorId === String(idPesquisa).trim()) {
      aba.getRange(i + 1, idxUltimaImportacao + 1).setValue(dataHora || new Date());
      return true;
    }
  }

  throw new Error('Pesquisa não encontrada para atualizar ultima_importacao_em: ' + idPesquisa);
}