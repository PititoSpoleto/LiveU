import express, { request, response } from 'express'
import bodyParser from 'body-parser'
import axios from 'axios'
import sql from 'mssql'
import qs from 'qs'
import tedious from 'tedious'
import querystring, { stringify } from 'querystring'
import pkg from 'body-parser'
const { urlencoded } = pkg
const app = express()
const port = 3000
const connStr = {
    server: 'virtual2.febracorp.org.br',
    authentication: {
        type: 'default',
        options: {
            userName: 'user_trial',
            password: '7412LIVE!@#$%¨&*()'
        }
    },
    options: {
        port: 1433,
        encrypt: false,
        database: 'CONTOSO'
    }
};


app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())

const router = express.Router()
router.get('/', (req, res) => res.render('index.ejs'))
app.use('/', router)
app.set('view engine', 'ejs')

router.post('/views/index', (req, res) => {
    const nome = req.body.nome
    const sobre = req.body.sobrenome
    const email = req.body.email

    rotina(nome, sobre, email)
    res.render('index.ejs')
})

// --- Rotina Envio dos dados --- //
export async function rotina(nome, sobrenome, email) {

    const codigos = await enviarDados(nome, sobrenome, email);

    // dissecar variavel CODIGOS

    const codNome = ""
    const codSobre = ""
    const codEmail = ""

    insertNome(nome, codNome)
    insertSobre(sobrenome, codSobre)
    insertEmail(email, codEmail)

    const totalGeral = totalNome(codNome) + totalSobre(codSobre) + totalEmail(codEmail)

    const resultQry = resultados(totalGeral)

    // dissecar resultQry em 3 strings

    preencherTabela(animal, pais, cor)
}
// ------------------------------ //


// --- Configuração AXIOS --- //
const options = {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    url: 'http://138.68.29.250:8082/',
    transformResponse: [function transformResponse(data) {
        data = querystring.stringify(data)
        return data;
    }]
}
axios(options)
// -------------------------- //

// --- Enviando os dados do formulário para API --- //
async function enviarDados(nome, sobrenome, email) {

    var resposta
    await axios.post('http://138.68.29.250:8082/', querystring.stringify({
        nome: nome,
        sobrenome: sobrenome,
        email: email
    }))
        .then(function (response) {
            console.log(response.data)
            resposta = response
        })
        .catch(function (error) {
            console.log("Erro codigo AXIOS: " + error);
        })
    return resposta
}

// --- Função para preencher tabela HTML --- //
function preencherTabela(animal, pais, cor) {

    document.getElementById('animal').textContent = document.getElementById(animal).innerHTML
    document.getElementById('pais').textContent = document.getElementById(pais).innerHTML
    document.getElementById('cor').textContent = document.getElementById(cor).innerHTML
    
}


// ---           Funções do Banco de Dados          --- //

// ---          Conexão com o banco de dados        --- //
sql.connect(connStr)
    .then(conn => global.conn = conn)
    .catch(err => console.log("erro db connect! " + err));


// ---    Envio e recuperação de dados do banco     --- //

//Funções de Inserção

// Insertção geral
async function inserts(item, cod, qry) {
    const valores = item + ', ' + cod;
    const insertQry = qry;

    var dbConn = new sql.ConnectionPool(connStr);
    await dbConn.connect().then(function () {
        var transaction = new sql.Transaction(dbConn);
        transaction.begin().then(function () {
            var request = new sql.Request(transaction);
            request.query(insertQry + valores + ');')
                .then(function () {
                    transaction.commit().then(function (resp) {
                        console.log(resp);
                        dbConn.close();
                    }).catch(function (err) {
                        console.log("Error in Transaction Commit " + err);
                        dbConn.close();
                    });
                }).catch(function (err) {
                    console.log("Error in Transaction Begin " + err);
                    dbConn.close();
                })
        }).catch(function (err) {
            console.log(err);
            dbConn.close();
        }).catch(function (err) {
            console.log(err);
        });
    });

}

// Inserções específicas
function insertNome(nome, cod) {
    const qry = "INSERT INTO tbs_nome(nome, cod) VALUES("
    inserts(nome, parseInt(cod), qry);
}

async function insertSobre(sobre, cod) {
    const qry = "INSERT INTO tbs_sobrenome(sobrenome, cod) VALUES("
    inserts(sobre, parseInt(cod), qry);
}

async function insertEmail(email, cod) {
    const qry = "INSERT INTO tbs_email(email, cod) VALUES("
    inserts(email, parseInt(cod), qry);
}


// ---      Funções de consulta      --- //

//Funções abaixo retornam o total da soma COD + SOMA 
//dos campos nome, sobrenome e email

// Consulta geral
async function somaCod(cod, qry) {

    const selectQry = qry
    const valores = cod
    var dbConn = new sql.ConnectionPool(connStr)
    var resposta = "";

    await dbConn.connect().then(function () {
        var request = new sql.Request(connStr)
        request.query(selectQry + valores + ' ;')
            .then(function (resp) {
                console.log(resp)
                resposta = resp
                dbConn.close()
            }).catch(function (err) {
                console.log(err)
                dbConn.close()
            })
    }).catch(function (err) {
        console.log(err);
    })

    return resposta
}

//Consultas específicas

async function totalNome(cod) {
    const qry = "SELECT soma + cod AS totalNome FROM tbs_cod_nome WHERE tbs_cod_nome.cod =="
    const total = await somaCod(parseInt(cod), qry)
    return total
}

async function totalSobre(cod) {
    const qry = "SELECT soma + cod AS totalSobre FROM tbs_cod_sobrenome WHERE tbs_cod_sobrenome.cod =="
    const total = await somaCod(parseInt(cod), qry)
    return total
}

async function totalEmail(cod) {
    const qry = "SELECT soma + cod AS totalEmail FROM tbs_cod_email WHERE tbs_cod_email.cod =="
    const total = await somaCod(parseInt(cod), qry)
    return total
}

//Função SELECT => ANIMAL, COR e PAIS

async function resultados(total) {

    const valores = total
    const selectQry = 'SELECT A.animal, P.pais, CORES.cor FROM tbs_animais AS A JOIN tbs_paises AS P JOIN (SELECT C.cor, C.total FROM tbs_cores AS C LEFT JOIN tbs_cores_excluidas AS CE ON C.cor = CE.cor WHERE CE.cor is null) AS CORES ON A.total == P.total == CORES.total WHERE A.total && P.total && CORES.total == '
    const resultado = ""

    var dbConn = new sql.ConnectionPool(connStr)
    var animal = ""
    var pais = ""
    var cor = ""

    await dbConn.connect().then(function () {
        var request = new sql.Request(connStr)
        request.query(selectQry + valores + ' ;')
            .then(function (resp) {
                console.log(resp)
                resultado = resp
                dbConn.close()
            }).catch(function (err) {
                console.log(err)
                dbConn.close()
            })
    }).catch(function (err) {
        console.log(err);
    })
    return resultado
}

app.listen(port)
console.log('API funcionando!')