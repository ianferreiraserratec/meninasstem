function onOpen() {
  var ui = SpreadsheetApp.getUi();

  ui.createMenu('Pesquisas')
    .addItem('Atualizar perguntas', 'abrirSeletorAtualizarPerguntas')
    .addItem('Importar respostas', 'abrirSeletorImportarRespostas')
    .addToUi();
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function abrirSeletorAtualizarPerguntas() {
  abrirSeletorPesquisa('atualizar_perguntas');
}

function abrirSeletorImportarRespostas() {
  abrirSeletorPesquisa('importar_respostas');
}

function abrirSeletorPesquisa(modo) {
  var template = HtmlService.createTemplateFromFile('seletor_pesquisa');
  template.modo = modo;

  var html = template.evaluate()
    .setWidth(420)
    .setHeight(220);

  SpreadsheetApp.getUi().showModalDialog(html, 'Selecionar pesquisa');
}

function listarPesquisas() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var aba = ss.getSheetByName('dim_pesquisas');

  if (!aba) {
    throw new Error('A aba "dim_pesquisas" não foi encontrada.');
  }

  var dados = aba.getDataRange().getValues();

  if (dados.length < 2) {
    return [];
  }

  var cabecalhos = dados[0];
  var idxPesquisa = cabecalhos.indexOf('id_pesquisa');

  if (idxPesquisa === -1) {
    throw new Error('A coluna "id_pesquisa" não foi encontrada na aba "dim_pesquisas".');
  }

  var pesquisas = dados
    .slice(1)
    .map(function(linha) {
      return linha[idxPesquisa];
    })
    .filter(function(valor) {
      return valor !== '' && valor !== null;
    })
    .map(function(valor) {
      return String(valor).trim();
    });

  pesquisas.sort();

  return pesquisas;
}


function executarAcaoPesquisa(modo, idPesquisa) {
  if (!idPesquisa) {
    throw new Error('Nenhuma pesquisa foi selecionada.');
  }

  if (modo === 'atualizar_perguntas') {
    return atualizarDimPerguntas(idPesquisa);
  }

  if (modo === 'importar_respostas') {
  return importarRespostasPesquisa(idPesquisa);
}

  throw new Error('Modo inválido: ' + modo);
}

function validarPesquisaParaAtualizarPerguntas(pesquisa) {
  if (!pesquisa) {
    throw new Error('Pesquisa não informada para validação.');
  }

  if (!String(pesquisa.id_pesquisa || '').trim()) {
    throw new Error('A pesquisa está sem "id_pesquisa".');
  }

  if (!String(pesquisa.forms_id || '').trim()) {
    throw new Error(
      'A pesquisa "' + pesquisa.id_pesquisa + '" está sem "forms_id" preenchido na dim_pesquisas.'
    );
  }

  return true;
}