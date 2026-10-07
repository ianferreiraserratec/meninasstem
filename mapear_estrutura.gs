function mapearEstrutura() {
  const ss = SpreadsheetApp.getActive();
  const nomeMapa = 'MAPA_ESTRUTURA';

  let mapa = ss.getSheetByName(nomeMapa);
  if (mapa) mapa.clear();
  else mapa = ss.insertSheet(nomeMapa);

  const saida = [['aba', 'coluna', 'cabecalho', 'valores_possiveis']];

  ss.getSheets()
    .filter(aba => aba.getName() !== nomeMapa)
    .forEach(aba => {
      const dados = aba.getDataRange().getValues();
      if (!dados.length) return;

      const cabecalhos = dados[0];

      cabecalhos.forEach((cabecalho, col) => {
        if (!cabecalho) return;

        const valores = [...new Set(
          dados.slice(1)
            .map(linha => linha[col])
            .filter(v => v !== '' && v !== null)
            .map(String)
        )];

        // Só exibe domínio quando houver até 30 valores distintos
        const dominio = valores.length <= 30
          ? valores.join(' | ')
          : `[${valores.length} valores distintos]`;

        saida.push([
          aba.getName(),
          col + 1,
          cabecalho,
          dominio
        ]);
      });
    });

  mapa.getRange(1, 1, saida.length, saida[0].length).setValues(saida);
  mapa.setFrozenRows(1);
  mapa.autoResizeColumns(1, 4);
}