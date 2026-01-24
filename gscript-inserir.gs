function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000); 

  try {
    const params = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const PASTA_ID = "1szc3tN-1nubNXk0Hl0LtGKb2V71G-NKE";

     // --- AÇÃO: EXCLUSÃO DE EVENTO EM LOTE (Versão Robusta) ---
    if (params.action === "deleteEvent") {
      const idAula = String(params.ID_AULA).trim();
      
      const limparAba = (nomeAba) => {
        const sheet = ss.getSheetByName(nomeAba);
        if (!sheet) return;
        const range = sheet.getDataRange();
        const rows = range.getValues();
        const headers = rows[0];
        const colIdx = headers.indexOf("ID_AULA");
        if (colIdx === -1) return;

        // Filtra comparando como String e sem espaços
        const filtered = rows.filter((row, idx) => {
          return idx === 0 || String(row[colIdx]).trim() !== idAula;
        });

        if (filtered.length < rows.length) { // Só grava se algo mudou
          range.clearContent();
          sheet.getRange(1, 1, filtered.length, headers.length).setValues(filtered);
        }
      };

      limparAba("Consagração");
      limparAba("Comp_Cons");
      return successResponse("Evento e presenças removidos com sucesso!");
    }

    // --- AÇÃO: SALVAR CHAMADA EM LOTE (Versão Robusta) ---
    if (params.action === "saveAttendance") {
      const sheet = ss.getSheetByName("Comp_Cons");
      if (!sheet) return errorResponse("Aba Comp_Cons não encontrada");
      
      const idAula = String(params.ID_AULA).trim();
      const novasPresencas = params.data; 

      const range = sheet.getDataRange();
      const rows = range.getValues();
      const headers = rows[0];
      const colIdx = headers.indexOf("ID_AULA");
      if (colIdx === -1) return errorResponse("Coluna ID_AULA não encontrada");
      
      // Filtra removendo os antigos desta aula específica
      const filteredData = rows.filter((row, index) => {
        return index === 0 || String(row[colIdx]).trim() !== idAula;
      });

      // Mapeia os novos dados de acordo com os cabeçalhos
      const newRowsMatrix = novasPresencas.map(item => headers.map(h => item[h] || ""));
      const finalMatrix = filteredData.concat(newRowsMatrix);

      range.clearContent();
      sheet.getRange(1, 1, finalMatrix.length, headers.length).setValues(finalMatrix);

      return successResponse("Chamada salva e antiga removida!");
    }

    // --- AÇÃO: EXCLUSÃO ---
    if (params.action === "delete") {
      const aba = ss.getSheetByName(params.sheet);
      const dados = aba.getDataRange().getValues();
      
      if (params.sheet === "Lembretes") {
        // ... (Lógica de lembretes mantém igual) ...
        for (let i = 1; i < dados.length; i++) {
          if (dados[i][0] == params.id_Lembrete) {
            aba.deleteRow(i + 1);
            return successResponse("Aviso removido");
          }
        }
} else if (params.sheet === "Repertório_PWA") {
        for (let i = dados.length - 1; i >= 1; i--) {
          // Converte a data da planilha para o formato ISO (YYYY-MM-DD...)
          // Isso garante que a comparação funcione independente de como o Sheets formatou a célula
          let dataPlanilha = "";
          if (dados[i][4] instanceof Date) {
            dataPlanilha = dados[i][4].toISOString();
          } else {
            dataPlanilha = String(dados[i][4]);
          }

          if (String(dados[i][0]) === String(params.Músicas) && 
              String(dados[i][3]) === String(params.Culto) && 
              dataPlanilha === String(params.Data)) {
            aba.deleteRow(i + 1);
            return successResponse("Música removida do repertório");
          }
        }
        return errorResponse("Música não encontrada para excluir");
      } else {
        // Fallback para outras abas (compatibilidade antiga se precisar)
         for (let i = dados.length - 1; i >= 1; i--) {
           // Ajuste conforme necessidade ou mantenha o antigo se ainda usar a aba "Musicas" velha
           if (dados[i][0] === params.musica && dados[i][2] === params.culto) {
             aba.deleteRow(i + 1);
             break; 
           }
         }
         return successResponse("Registro excluído");
      }
    }

    // --- AÇÃO: ADICIONAR Lembretes ---
    if (params.sheet === "Lembretes") {
      const sheet = ss.getSheetByName("Lembretes");
      sheet.appendRow([params.id_Lembrete, params.Componente, params.Data, params.Culto, params.Info]);
      return successResponse("Aviso comunicado");
    }

    // --- AÇÃO: UPLOAD DE IMAGEM ---
    if (params.action === "uploadImage") {
      const folder = DriveApp.getFolderById(PASTA_ID);
      const blob = Utilities.newBlob(Utilities.base64Decode(params.base64), params.mimeType, params.fileName);
      const file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      return jsonResponse({ status: "success", fileId: file.getId() });
    }

    // --- AÇÃO: EXCLUIR IMAGEM DO DRIVE ---
    if (params.action === "deleteFile" || params.action === "deleteImage") {
      DriveApp.getFileById(params.fileId).setTrashed(true);
      return successResponse("Arquivo removido");
    }

    // --- AÇÃO: ADICIONAR AO HISTÓRICO (Versão Atualizada) ---
    if (params.action === "addHistory") {
      const sheetHist = ss.getSheetByName("Historico de Músicas"); 
      const musicasParaAdd = Array.isArray(params.data) ? params.data : [params];
      const dadosAtuais = sheetHist.getDataRange().getValues();
      let adicionadas = 0;
      
      musicasParaAdd.forEach(item => {
        // Verifica duplicata pelo nome da musica (Coluna B)
        const tituloParaSalvar = String(item.musicaCantor || "").trim();
        const jaExiste = dadosAtuais.some(row => 
          String(row[1]).toLowerCase().trim() === tituloParaSalvar.toLowerCase()
        );
        
        if (!jaExiste && tituloParaSalvar !== "") {
          // Coluna A -> Ministro | Coluna B -> Musica - Cantor | Coluna C -> Tom
          sheetHist.appendRow([
            item.ministro || "Líder não definido", 
            tituloParaSalvar, 
            item.tom || "--"
          ]);
          adicionadas++;
        }
      });
      return jsonResponse({ status: "success", message: adicionadas + " músicas adicionadas ao histórico." });
    }

    // --- AÇÃO: ATUALIZAR PERFIL DO USUÁRIO ---
    if (params.action === "updateUser") {
      const sheet = ss.getSheetByName("Acesso");
      const data = sheet.getDataRange().getValues();
      const originalNome = params.originalNome;
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] == originalNome) {
          const row = i + 1;
          sheet.getRange(row, 1).setValue(params.nome);
          sheet.getRange(row, 2).setValue(params.user);
          sheet.getRange(row, 3).setValue(params.senha);
          return successResponse("Perfil atualizado");
        }
      }
      return errorResponse("Usuário não encontrado");
    }

    // --- AÇÃO: CADASTRO DE MÚSICAS ---
    if (params.sheet === "Musicas") {
      const sheet = ss.getSheetByName("Musicas");
      const musica = params.Musica.trim();
      const cantor = params.Cantor.trim();
      const buscaTermo = musica + " " + cantor;
      const urlPlus = buscaTermo.split(' ').join('+');
      const urlEnc = encodeURIComponent(buscaTermo);
      const formulas = [
        '=HYPERLINK("https://music.youtube.com/search?q=' + urlPlus + '"; "Youtube Music")',
        '=HYPERLINK("https://open.spotify.com/search/' + urlEnc + '"; "Spotify")',
        '=HYPERLINK("https://www.letras.mus.br/?q=' + urlEnc + '"; "Letra")',
        '=HYPERLINK("https://www.cifraclub.com.br/?q=' + urlPlus + '"; "Cifra")'
      ];
      const proximaLinha = sheet.getLastRow() + 1;
      sheet.getRange(proximaLinha, 1, 1, 4).setValues([[params.Tema, params.Estilo, musica, cantor]]);
      sheet.getRange(proximaLinha, 5, 1, 4).setFormulas([formulas]);
      return successResponse("Música cadastrada");
    }

    // --- AÇÃO: REPERTÓRIO (NOVO - Repertorio_PWA) ---
    // Colunas: Músicas | Cantor | Tons | Culto | Data | Ministro
    if (params.sheet === "Repertorio_PWA") {
      const sheet = ss.getSheetByName("Repertorio_PWA");
      // O frontend já manda a Data formatada (DD/MM/YYYY) e separado Músicas/Cantor
      sheet.appendRow([
        params.Músicas,
        params.Cantor, 
        params.Tons, 
        params.Culto, 
        params.Data, 
        params.Ministro
      ]);
      return successResponse("Repertório salvo");
    }

    // --- AÇÃO GENÉRICA: ADICIONAR LINHA (Fallback) ---
    if (params.action === "addRow") {
      const sheet = ss.getSheetByName(params.sheet);
      if (!sheet) return errorResponse("Aba não encontrada");
      const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      const newRow = headers.map(h => params.data[h] || "");
      sheet.appendRow(newRow);
      return successResponse("Dados salvos");
    }

  } catch (err) {
    return errorResponse(err.toString());
  } finally {
    lock.releaseLock();
  }
}

function successResponse(msg) { return jsonResponse({ status: "success", message: msg }); }
function errorResponse(msg) { return jsonResponse({ status: "error", message: msg }); }
function jsonResponse(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }