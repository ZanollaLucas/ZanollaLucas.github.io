async function gerarPix(valorTotal) {
    const formData = new FormData();
    formData.append("valor", valorTotal);

    try {
        const response = await fetch("https://casamentobackdeploy.onrender.com/pix/gerar", {
            method: "POST",
            body: formData
        });

        if (!response.ok) {
            throw new Error("Erro ao gerar PIX");
        }

        const data = await response.json();
        console.log("Código Pix:", data.codigoPix);
        console.log("Caminho do QR Code:", data.caminhoQRCode);

        // Obtém elementos do modal
        const qrCodeImage = document.getElementById("qrCodeImage");
        const codigoPixElement = document.getElementById("codigoPix");

        // Atualiza a imagem do QR Code
        qrCodeImage.src = `https://casamentobackdeploy.onrender.com/pix/qrcode?path=${encodeURIComponent(data.caminhoQRCode)}`;
        qrCodeImage.alt = "QR Code do Pix gerado";

        // Atualiza o código Pix
        codigoPixElement.textContent = data.codigoPix;

        // Mostra o modal apenas quando a imagem é carregada
        qrCodeImage.onload = () => {
            document.getElementById("qrCodeModal").style.display = "flex";
        };

    } catch (error) {
        console.error("Erro:", error);
    }
}

// Função para copiar o código Pix ao clicar em qualquer parte do container
function copiarCodigoPix() {
    const codigoPixElement = document.getElementById("codigoPix");
    const codigoPix = codigoPixElement.textContent.trim(); // Remove espaços extras

    navigator.clipboard.writeText(codigoPix).then(() => {
        alert("Código Pix copiado!");
    }).catch(err => {
        console.error("Erro ao copiar código Pix:", err);
    });
}

// Adiciona o evento de clique ao container inteiro
document.getElementById("codigoPix").parentElement.addEventListener("click", copiarCodigoPix);

// Função para armazenar o presente selecionado para o envio posterior
let dadosCompra = {};

async function EnviarOK() {
    const { id, valor } = dadosCompra;
    const quantidadeInput = document.getElementById(`${id}`);
    if (!quantidadeInput) {
        console.error(`Erro: Input de quantidade para ID ${id} não encontrado.`);
        return;
    }

    const quantidade = parseInt(quantidadeInput.value, 10);
    const valorTotal = valor * quantidade;

    // Capturar o nome do doador
    const nomeDoador = document.getElementById("doadorNome").value.trim();

    // Verificar se o nome do doador não está vazio
    if (nomeDoador === "") {
        alert("Por favor, insira seu nome.");
        return; // Não envia a compra se o nome estiver vazio
    }

    const dadosCompraPost = {
        nomeDonatario: nomeDoador, // Substitui "teste" pelo nome do doador
        presenteid: id,
        valorTotal: valorTotal,
        valorPresente: valor,
        quantidade: quantidade,
        dataHora: new Date()
    };

    try {
        const response = await fetch("https://casamentobackdeploy.onrender.com/transacoes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(dadosCompraPost)
        });

        if (!response.ok) throw new Error("Erro ao realizar a compra");

        const data = await response.json();
        console.log("Compra realizada:", data);
        alert("Compra realizada com sucesso!");

        // Limpar os valores após a compra
        window.comprando = null;
        window.qrCode = "";
        window.nomeComprador = "";

        // Limpar o campo de nome do doador após a compra
        document.getElementById("doadorNome").value = "";

        fecharModal();

    } catch (error) {
        console.error("Erro ao realizar a compra:", error);
        alert("Ocorreu um erro ao processar a compra.");
    }
}

// Função para fechar o modal
function fecharModal() {
    document.getElementById("qrCodeModal").style.display = "none";
}

// Função para buscar os presentes e gerar os cards
async function carregarPresentes() {
    const cardContainer = document.getElementById("cardContainer");
    //console.log("entrou no prente")

    // Mostra um indicador de carregamento
    cardContainer.innerHTML = "<p id='loading'>Carregando presentes...</p>";

    for (let tentativa = 1; tentativa <= 5; tentativa++) {
        //console.log("entrou no for");
        try {
            //const response = await fetch("https://casamentobackdeploy.onrender.com/presente");
            //console.log("entrou no carregar presntes dentro do for try");
            const response = await fetchComTimeout("https://casamentobackdeploy.onrender.com/presente", 5000);

            if (!response.ok) {
                throw new Error("Erro ao carregar presentes http");
            }

            let presentes;
            try {
                const texto = await response.text();
                //alert("Resposta da API:" + texto); // Log para debug
                presentes = JSON.parse(texto);

                if (!Array.isArray(presentes)) {
                    throw new Error("Resposta não é um array válido.");
                }
            } catch (jsonError) {
                throw new Error(`Erro ao converter resposta para JSON: ${jsonError.message}`);
            }

            const cardContainer = document.getElementById("cardContainer");

            cardContainer.innerHTML = "";

            presentes.forEach(presente => {
                try {
                    console.log("Processando presente:", presente);
                    // Criando o card do presente
                    const card = document.createElement("div");
                    card.classList.add("card");

                    // Verificar se o valor do presente é null ou 0.00 e permitir edição
                    let valorPresente = presente.valor;
                    let valorHTML = `
                <p>R$ <span id="valorPresente${presente.id}">${valorPresente.toFixed(2)}</span></p>
            `;
                    let botao = `
                    <div class="card button">
                        <button onclick="gerarPixParaPresente(${presente.id}, ${presente.valor})">Gerar PIX</button>
                    </div>    
            `;

                    if (valorPresente === null || valorPresente === 0.00) {
                        valorHTML = `
                    <label for="valorPresenteInput${presente.id}">Valor em R$:</label>
                    <input    type="text" 
                        id="valorPresenteInput${presente.id}" 
                        name="valorPresente" 
                        value="0.00" 
                        style="width: 100px; padding: 5px; margin-top: 10px;" 
                        onkeydown="bloquearLetras(event, this)"
                        onblur="formatarValorNoBlur(this)"
                        placeholder="Digite o valor"
                    >
                `;
                    botao = `
                        <div class="botao-container">
                            <button onclick="gerarPixParaPresente(${presente.id}, parseFloat(document.getElementById('valorPresenteInput${presente.id}').value.replace(',', '.')))">Gerar PIX</button>
                        </div>
                    `;

                    }

                    // Adicionando o HTML do card
                    card.innerHTML = `
                <img src="${presente.img}" alt="${presente.nome}">
                <h3>${presente.nome}</h3>
                <p>${presente.descricao}</p>
                ${valorHTML}
                <label for="${presente.id}">Quantidade:</label>
                <input type="number" id="${presente.id}" name="quantidade" value="1" min="1">
                ${botao}
            `;

                    // Adicionando o card ao container
                    cardContainer.appendChild(card);

                    // Atualizar o valor quando o input de valor for alterado
                    if (valorPresente === null || valorPresente === 0.00) {
                        const valorInput = document.getElementById(`valorPresenteInput${presente.id}`);
                        valorInput.addEventListener('change', (event) => {
                            const novoValor = parseFloat(event.target.value);
                            if (!isNaN(novoValor) && novoValor >= 0) {
                                // Atualiza o valor no card
                                const valorElemento = document.getElementById(`valorPresente${presente.id}`);
                                if (valorElemento) {
                                    valorElemento.textContent = `R$ ${novoValor.toFixed(2)}`;
                                } else {
                                    console.error(`Elemento com ID "valorPresente${presente.id}" não encontrado.`);
                                }
                            } else {
                                alert("Por favor, insira um valor válido.");
                            }
                        });
                    }
                } catch (cardError) {
                    console.error(`Erro ao processar o presente ${presente?.id}:`, cardError);
                }
            });
        break;    
        } catch (error) {
            if (error.message.includes("timeout")) {
                console.warn(`Tentativa ${tentativa} falhou: Timeout. Tentando novamente...`);
            } else if (error.message.includes("JSON")) {
                console.error(`Tentativa ${tentativa} falhou: Problema no JSON.`, error);
            } else {
                console.error(`Tentativa ${tentativa} falhou: Erro inesperado.`, error);
            }

            if (tentativa === 5) {
                cardContainer.innerHTML = "<p style='color: red;'>Erro ao carregar os presentes. Favor abra o site novamente.</p>";
            } else {
                await new Promise(resolve => setTimeout(resolve, 3000)); // Aguarda 3 segundos antes de tentar novamente
            }
        }
    }
}

async function fetchComTimeout(url, timeout = 10000) {
    const controller = new AbortController();
    const signal = controller.signal;
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, { signal });

        // Se a resposta foi recebida a tempo, limpa o timeout
        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`Erro HTTP ${response.status}: ${response.statusText}`);
        }

        return response;
    } catch (error) {
        if (error.name === "AbortError") {
            throw new Error("Tempo limite excedido ao tentar carregar os presentes.");
        }
        throw error;
    } finally{
        clearTimeout(timeoutId);
    }
}




// Função para gerar o Pix para um presente específico com a quantidade
async function gerarPixParaPresente(id, valor) {
    const quantidadeInput = document.getElementById(`${id}`);
    if (!quantidadeInput) {
        console.error(`Erro: Input de quantidade para ID ${id} não encontrado.`);
        return;
    }

    if (valor === 0.00 || valor === null) {
        alert("Por favor, insira um valor válido ou diferente de 0.00")
    }

    const quantidade = parseInt(quantidadeInput.value, 10);
    if (isNaN(quantidade) || quantidade <= 0) {
        alert("Por favor, insira uma quantidade válida.");
        return;
    }

    const valorTotal = valor * quantidade;
    await gerarPix(valorTotal);

    // Armazena os dados do presente selecionado
    dadosCompra = { id, valor };

    // Espera o usuário clicar no botão "PIX Realizado"
    document.getElementById("pixRealizadoBtn").addEventListener("click", EnviarOK);
}

// Carregar presentes assim que a página for carregada
document.addEventListener("DOMContentLoaded", carregarPresentes);


function formatarValorNoBlur(input) {
    let valor = input.value;

    // Substituir vírgula por ponto para tratar igual em ambos os casos
    valor = valor.replace(",", ".");

    // Remover todos os caracteres não numéricos, exceto ponto
    valor = valor.replace(/[^0-9.]/g, "");

    // Limitar a duas casas decimais
    let [integer, decimal] = valor.split('.');
    if (decimal) {
        decimal = decimal.substring(0, 2); // Limita a 2 casas decimais
    }

    // Formatar valor com vírgula se tiver casas decimais
    if (decimal) {
        input.value = `${integer},${decimal}`;
    } else {
        input.value = integer;
    }
}

function bloquearLetras(event, input) {
    const tecla = event.key;

    // Permite números, vírgula, ponto e as teclas de controle como Backspace, Delete e Arrow keys
    if (!/[0-9,\.]/.test(tecla) && tecla !== "Backspace" && tecla !== "Delete" && tecla !== "ArrowLeft" && tecla !== "ArrowRight") {
        event.preventDefault(); // Bloqueia a entrada se não for um número, ponto ou vírgula
        return;
    }

    // Bloqueia a entrada de um segundo ponto ou vírgula
    const valorAtual = input.value;
    if ((tecla === "." || tecla === ",") && (valorAtual.includes(".") || valorAtual.includes(","))) {
        event.preventDefault(); // Bloqueia o segundo ponto ou vírgula
    }
}
