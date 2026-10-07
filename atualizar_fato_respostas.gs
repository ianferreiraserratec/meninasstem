function importarRespostasPesquisa(idPesquisa) {
  var pesquisa = buscarPesquisaPorId(idPesquisa);
  var dadosRespostas = null;
  var todasRespostas = [];
  var totalNaoEncontrado = 0;
  var totalAmbiguidade = 0;
  var totalPerguntasMapeadas = 0;
  var inconsistencias = [];

  try {
    validarPesquisaParaImportarRespostas(pesquisa);

    dadosRespostas = lerAbaRespostas(
      pesquisa.sheet_respostas_id,
      pesquisa.aba_respostas_nome
    );

    var mapeamento = mapearCabecalhosComPerguntas(
      idPesquisa,
      dadosRespostas.cabecalhos,
      pesquisa.campo_identificador_forms
    );

    totalPerguntasMapeadas = Object.keys(mapeamento.mapaColunasPerguntas).length;

    var vinculos = lerFatoVinculos();
    var importadoEm = new Date();

    if (dadosRespostas.linhas.length === 0) {
      registrarLogProcessamento({
        data_hora_execucao: new Date(),
        acao: 'importar_respostas',
        id_pesquisa: idPesquisa,
        qtd_perguntas_lidas: totalPerguntasMapeadas,
        qtd_respostas_forms: 0,
        qtd_linhas_geradas: 0,
        qtd_nao_encontrados: 0,
        qtd_ambiguidades: 0,
        status_execucao: 'sucesso',
        mensagem_resumo: 'Não havia respostas para importar.'
      });

      return 'Não há respostas para importar.';
    }

    dadosRespostas.linhas.forEach(function(linha, i) {
      var resultado = transformarLinhaEmRespostasFato(
        linha,
        i + 1,
        mapeamento,
        pesquisa,
        vinculos,
        importadoEm,
        inconsistencias
      );

      if (resultado.status === 'nao_encontrado') {
        totalNaoEncontrado++;
        return;
      }

      if (resultado.status === 'ambiguidade') {
        totalAmbiguidade++;
        return;
      }

      todasRespostas = todasRespostas.concat(resultado.respostas);
    });

    apagarRespostasDaPesquisa(idPesquisa);
    gravarRespostasNaFato(todasRespostas);
    atualizarUltimaImportacaoPesquisa(idPesquisa, importadoEm);
    registrarLogInconsistencias(inconsistencias);

    registrarLogProcessamento({
      data_hora_execucao: new Date(),
      acao: 'importar_respostas',
      id_pesquisa: idPesquisa,
      qtd_perguntas_lidas: totalPerguntasMapeadas,
      qtd_respostas_forms: dadosRespostas.linhas.length,
      qtd_linhas_geradas: todasRespostas.length,
      qtd_nao_encontrados: totalNaoEncontrado,
      qtd_ambiguidades: totalAmbiguidade,
      status_execucao: 'sucesso',
      mensagem_resumo: 'Importação concluída com sucesso.'
    });

    return (
      'Importação concluída com sucesso:\n\n' +
      'Total de respostas: ' + dadosRespostas.linhas.length + '\n' +
      'Total de linhas gravadas: ' + todasRespostas.length + '\n' +
      'Não encontrados: ' + totalNaoEncontrado + '\n' +
      'Ambiguidades: ' + totalAmbiguidade
    );

  } catch (e) {
    registrarLogProcessamento({
      data_hora_execucao: new Date(),
      acao: 'importar_respostas',
      id_pesquisa: idPesquisa,
      qtd_perguntas_lidas: totalPerguntasMapeadas,
      qtd_respostas_forms: dadosRespostas ? dadosRespostas.linhas.length : 0,
      qtd_linhas_geradas: todasRespostas.length,
      qtd_nao_encontrados: totalNaoEncontrado,
      qtd_ambiguidades: totalAmbiguidade,
      status_execucao: 'erro',
      mensagem_resumo: e.message
    });

    throw e;
  }
}

function validarPesquisaParaImportarRespostas(pesquisa) {
  if (!pesquisa) {
    throw new Error('Pesquisa não informada para validação.');
  }

  if (!String(pesquisa.id_pesquisa || '').trim()) {
    throw new Error('A pesquisa está sem "id_pesquisa".');
  }

  if (!String(pesquisa.sheet_respostas_id || '').trim()) {
    throw new Error(
      'A pesquisa "' + pesquisa.id_pesquisa + '" está sem "sheet_respostas_id" preenchido.'
    );
  }

  if (!String(pesquisa.aba_respostas_nome || '').trim()) {
    throw new Error(
      'A pesquisa "' + pesquisa.id_pesquisa + '" está sem "aba_respostas_nome" preenchido.'
    );
  }

  if (!String(pesquisa.campo_identificador_forms || '').trim()) {
    throw new Error(
      'A pesquisa "' + pesquisa.id_pesquisa + '" está sem "campo_identificador_forms" preenchido.'
    );
  }

  return true;
}

function abrirPlanilhaRespostas(sheetId) {
  try {
    return SpreadsheetApp.openById(sheetId);
  } catch (e) {
    throw new Error('Erro ao abrir a planilha de respostas.\n\n' + e.message);
  }
}

function lerAbaRespostas(sheetId, nomeAba) {
  var planilha = abrirPlanilhaRespostas(sheetId);
  var aba = planilha.getSheetByName(nomeAba);

  if (!aba) {
    throw new Error(
      'A aba "' + nomeAba + '" não foi encontrada na planilha de respostas.'
    );
  }

  var dados = aba.getDataRange().getValues();

  if (dados.length < 2) {
    return {
      cabecalhos: dados[0] || [],
      linhas: []
    };
  }

  var cabecalhos = dados[0];
  var linhas = dados.slice(1);

  return {
    cabecalhos: cabecalhos,
    linhas: linhas
  };
}

function obterPerguntasAtivasDaPesquisa(idPesquisa) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var aba = ss.getSheetByName('dim_perguntas');

  if (!aba) {
    throw new Error('A aba "dim_perguntas" não foi encontrada.');
  }

  var dados = aba.getDataRange().getValues();

  if (dados.length < 2) {
    return [];
  }

  var cabecalhos = dados[0];
  var idx = {};
  cabecalhos.forEach(function(coluna, i) {
    idx[coluna] = i;
  });

  var colunasObrigatorias = [
    'id_pergunta',
    'id_pesquisa',
    'texto_pergunta',
    'tipo_resposta',
    'ativo'
  ];

  colunasObrigatorias.forEach(function(coluna) {
    if (idx[coluna] === undefined) {
      throw new Error('A coluna "' + coluna + '" não foi encontrada na aba "dim_perguntas".');
    }
  });

  var perguntas = [];

  for (var i = 1; i < dados.length; i++) {
    var linha = dados[i];

    var idPesquisaLinha = String(linha[idx['id_pesquisa']] || '').trim();
    var ativo = linha[idx['ativo']];

    if (idPesquisaLinha === String(idPesquisa).trim() && String(ativo).toUpperCase() !== 'FALSE') {
      perguntas.push({
        id_pergunta: linha[idx['id_pergunta']],
        id_pesquisa: linha[idx['id_pesquisa']],
        texto_pergunta: String(linha[idx['texto_pergunta']] || '').trim(),
        tipo_resposta: String(linha[idx['tipo_resposta']] || '').trim()
      });
    }
  }

  return perguntas;
}

function mapearCabecalhosComPerguntas(idPesquisa, cabecalhos, campoIdentificadorForms) {
  var perguntas = obterPerguntasAtivasDaPesquisa(idPesquisa);

  var mapaPerguntasPorTexto = {};
  perguntas.forEach(function(pergunta) {
    mapaPerguntasPorTexto[normalizarCabecalho(pergunta.texto_pergunta)] = pergunta;
  });

  var identificadorNormalizado = normalizarCabecalho(campoIdentificadorForms);

  var resultado = {
    colunaTimestamp: -1,
    colunaIdentificador: -1,
    mapaColunasPerguntas: {}
  };

  cabecalhos.forEach(function(cabecalho, index) {
    var nomeColunaOriginal = String(cabecalho || '').trim();
    var nomeColunaNormalizado = normalizarCabecalho(nomeColunaOriginal);

    if (!nomeColunaOriginal) {
      return;
    }

    if (nomeColunaOriginal === 'Carimbo de data/hora') {
      resultado.colunaTimestamp = index;
      return;
    }

    if (nomeColunaNormalizado === identificadorNormalizado) {
      resultado.colunaIdentificador = index;
      return;
    }

    if (mapaPerguntasPorTexto[nomeColunaNormalizado]) {
      resultado.mapaColunasPerguntas[index] = mapaPerguntasPorTexto[nomeColunaNormalizado];
    }
  });

  if (resultado.colunaIdentificador === -1) {
    throw new Error(
      'A coluna identificadora "' + campoIdentificadorForms + '" não foi encontrada na aba de respostas.'
    );
  }

  if (resultado.colunaTimestamp === -1) {
    throw new Error('A coluna "Carimbo de data/hora" não foi encontrada na aba de respostas.');
  }

  return resultado;
}

function normalizarCabecalho(texto) {
  return String(texto || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_\s]+/g, '');
}

function lerFatoVinculos() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var aba = ss.getSheetByName('fato_vinculos');

  if (!aba) {
    throw new Error('A aba "fato_vinculos" não foi encontrada.');
  }

  var dados = aba.getDataRange().getValues();

  if (dados.length < 2) {
    return [];
  }

  var cabecalhos = dados[0];
  var idx = {};

  cabecalhos.forEach(function(coluna, i) {
    idx[coluna] = i;
  });

  var colunasObrigatorias = [
    'id_pessoa',
    'id_vinculo',
    'id_ciclo',
    'id_grupo',
    'nome_completo'
  ];

  colunasObrigatorias.forEach(function(coluna) {
    if (idx[coluna] === undefined) {
      throw new Error('A coluna "' + coluna + '" não foi encontrada na aba "fato_vinculos".');
    }
  });

  var vinculos = [];

  for (var i = 1; i < dados.length; i++) {
    var linha = dados[i];

    vinculos.push({
      id_pessoa: linha[idx['id_pessoa']],
      id_vinculo: linha[idx['id_vinculo']],
      id_ciclo: linha[idx['id_ciclo']],
      id_grupo: linha[idx['id_grupo']],
      nome_completo: String(linha[idx['nome_completo']] || '').trim()
    });
  }

  return vinculos;
}

function resolverVinculoPorNome(nomeCompleto, idCiclo, vinculos) {
  var nomeNormalizado = normalizarCabecalho(nomeCompleto);

  var matches = vinculos.filter(function(v) {
    return (
      normalizarCabecalho(v.nome_completo) === nomeNormalizado &&
      String(v.id_ciclo).trim() === String(idCiclo).trim()
    );
  });

  if (matches.length === 0) {
    return {
      status: 'nao_encontrado',
      vinculo: null
    };
  }

  if (matches.length > 1) {
    return {
      status: 'ambiguidade',
      vinculo: null
    };
  }

  return {
    status: 'ok',
    vinculo: matches[0]
  };
}

function explodirMultiplaSelecao(respostaBruta) {
  if (respostaBruta === null || respostaBruta === undefined || respostaBruta === '') {
    return [];
  }

  return String(respostaBruta)
    .split(',')
    .map(function(item) {
      return item.trim();
    })
    .filter(function(item) {
      return item !== '';
    });
}

function gerarIdResposta(idPesquisa, idPergunta, idVinculo, indiceLinha, indiceOpcao) {
  return [
    idPesquisa,
    idPergunta,
    idVinculo,
    'L' + indiceLinha,
    'O' + indiceOpcao
  ].join('__');
}

function transformarLinhaEmRespostasFato(linha, indiceLinha, mapeamento, pesquisa, vinculos, importadoEm, inconsistencias) {
  var respostas = [];

  var nomeRespondente = linha[mapeamento.colunaIdentificador];
  var dataResposta = linha[mapeamento.colunaTimestamp];

  var resolucao = resolverVinculoPorNome(nomeRespondente, pesquisa.id_ciclo, vinculos);

  if (resolucao.status === 'nao_encontrado') {
    inconsistencias.push({
      data_hora: new Date(),
      id_pesquisa: pesquisa.id_pesquisa,
      tipo_inconsistencia: 'nao_encontrado',
      nome_completo: nomeRespondente,
      id_ciclo: pesquisa.id_ciclo,
      detalhe: 'Nenhum vínculo encontrado para o nome informado na resposta.'
    });

    return {
      status: 'nao_encontrado',
      nomeRespondente: nomeRespondente,
      respostas: []
    };
  }

  if (resolucao.status === 'ambiguidade') {
    inconsistencias.push({
      data_hora: new Date(),
      id_pesquisa: pesquisa.id_pesquisa,
      tipo_inconsistencia: 'ambiguidade',
      nome_completo: nomeRespondente,
      id_ciclo: pesquisa.id_ciclo,
      detalhe: 'Mais de um vínculo encontrado para o nome informado na resposta.'
    });

    return {
      status: 'ambiguidade',
      nomeRespondente: nomeRespondente,
      respostas: []
    };
  }

  var vinculo = resolucao.vinculo;

  Object.keys(mapeamento.mapaColunasPerguntas).forEach(function(colunaIndexStr) {
    var colunaIndex = Number(colunaIndexStr);
    var pergunta = mapeamento.mapaColunasPerguntas[colunaIndex];
    var respostaBruta = linha[colunaIndex];

    if (respostaBruta === '' || respostaBruta === null || respostaBruta === undefined) {
      return;
    }

    if (pergunta.tipo_resposta === 'multipla_selecao') {
      var opcoes = explodirMultiplaSelecao(respostaBruta);

      opcoes.forEach(function(opcao, idxOpcao) {
        respostas.push({
          id_resposta: gerarIdResposta(
            pesquisa.id_pesquisa,
            pergunta.id_pergunta,
            vinculo.id_vinculo,
            indiceLinha,
            idxOpcao + 1
          ),
          id_pesquisa: pesquisa.id_pesquisa,
          id_pergunta: pergunta.id_pergunta,
          id_pessoa: vinculo.id_pessoa,
          id_vinculo: vinculo.id_vinculo,
          id_ciclo: vinculo.id_ciclo,
          id_grupo: vinculo.id_grupo,
          resposta_bruta: respostaBruta,
          resposta_tratada: opcao,
          data_resposta: dataResposta,
          origem_registro: 'forms',
          importado_em: importadoEm,
          observacoes: ''
        });
      });

    } else {
      respostas.push({
        id_resposta: gerarIdResposta(
          pesquisa.id_pesquisa,
          pergunta.id_pergunta,
          vinculo.id_vinculo,
          indiceLinha,
          1
        ),
        id_pesquisa: pesquisa.id_pesquisa,
        id_pergunta: pergunta.id_pergunta,
        id_pessoa: vinculo.id_pessoa,
        id_vinculo: vinculo.id_vinculo,
        id_ciclo: vinculo.id_ciclo,
        id_grupo: vinculo.id_grupo,
        resposta_bruta: respostaBruta,
        resposta_tratada: respostaBruta,
        data_resposta: dataResposta,
        origem_registro: 'forms',
        importado_em: importadoEm,
        observacoes: ''
      });
    }
  });

  return {
    status: 'ok',
    nomeRespondente: nomeRespondente,
    respostas: respostas
  };
}

function apagarRespostasDaPesquisa(idPesquisa) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var aba = ss.getSheetByName('fato_respostas_pesquisa');

  if (!aba) {
    throw new Error('A aba "fato_respostas_pesquisa" não foi encontrada.');
  }

  var dados = aba.getDataRange().getValues();

  if (dados.length < 2) {
    return;
  }

  var cab = dados[0];
  var idxPesquisa = cab.indexOf('id_pesquisa');

  if (idxPesquisa === -1) {
    throw new Error('Coluna id_pesquisa não encontrada na fato.');
  }

  var novasLinhas = [cab];

  for (var i = 1; i < dados.length; i++) {
    if (String(dados[i][idxPesquisa]).trim() !== String(idPesquisa).trim()) {
      novasLinhas.push(dados[i]);
    }
  }

  aba.clearContents();
  aba.getRange(1, 1, novasLinhas.length, novasLinhas[0].length).setValues(novasLinhas);
}

function gravarRespostasNaFato(respostas) {
  if (respostas.length === 0) return;

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var aba = ss.getSheetByName('fato_respostas_pesquisa');

  if (!aba) {
    throw new Error('A aba "fato_respostas_pesquisa" não foi encontrada.');
  }

  var cab = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0];

  var idx = {};
  cab.forEach(function(col, i) {
    idx[col] = i;
  });

  var linhas = respostas.map(function(r) {
    var linha = new Array(cab.length).fill('');

    linha[idx['id_resposta']] = r.id_resposta;
    linha[idx['id_pesquisa']] = r.id_pesquisa;
    linha[idx['id_pergunta']] = r.id_pergunta;
    linha[idx['id_pessoa']] = r.id_pessoa;
    linha[idx['id_vinculo']] = r.id_vinculo;
    linha[idx['id_ciclo']] = r.id_ciclo;
    linha[idx['id_grupo']] = r.id_grupo;
    linha[idx['resposta_bruta']] = r.resposta_bruta;
    linha[idx['resposta_tratada']] = r.resposta_tratada;
    linha[idx['data_resposta']] = r.data_resposta;
    linha[idx['origem_registro']] = r.origem_registro;
    linha[idx['importado_em']] = r.importado_em;
    linha[idx['observacoes']] = r.observacoes;

    return linha;
  });

  var startRow = aba.getLastRow() + 1;

  aba.getRange(startRow, 1, linhas.length, linhas[0].length).setValues(linhas);
}