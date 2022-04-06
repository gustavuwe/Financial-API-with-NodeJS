const express = require("express");
const { v4: uuidv4 } = require("uuid")

const app = express();

app.use(express.json())

const customers = [];

/**
 * cpf - string
 * name - string
 * id - uuid
 * statement []
 */

// Midleware
function verifyIfExistsAccountCPF(request, response, next) {
    const { cpf } = request.headers;

    const customer = customers.find(customer => customer.cpf === cpf)
    
    if(!customer) {
        return response.status(400).json({ error: "Customer not found" });
    }

    request.customer = customer;

    return next();
}

function getBalance(statement) {
    const balance = statement.reduce((acc, operation) => { // .reduce faz o calculo do que entrou menos o que saiu
        if(operation.type === 'credit') {
            return acc + operation.amount;
        } else { // se for de debito
            return acc - operation.amount // acc = acumulado
        }
    }, 0); // 0 é o valor inicial que começa

    return balance;
}

 app.post("/account", (request, response) => {
    const { cpf, name } = request.body;

    const customerAlreadyExists = customers.some(
        (customer) => customer.cpf === cpf
    );

    if(customerAlreadyExists) {
        return response.status(400).json({error: "Customer already exists!"})
    }
    
    const id = uuidv4();

    customers.push({
        cpf,
        name,
        id: uuidv4(),
        statement: []
    });

    return response.status(201).send();

});

// app.use(verifyIfExistsAccountCPF);

app.get("/statement", verifyIfExistsAccountCPF, (request, response) => {
   const { customer } = request;
   
    return response.json(customer.statement);
});
// deposita
app.post("/deposit", verifyIfExistsAccountCPF, (request, response) => {
    const { description, amount } = request.body;

    const { customer } = request; // verifica se é valido ou não

    const statementOperation = {
        description,
        amount,
        created_at: new Date(),
        type: "credit"
    }

    customer.statement.push(statementOperation);

    return response.status(201).send();
})
// saca
app.post("/withdraw", verifyIfExistsAccountCPF, (request, response) => {
    const { amount } = request.body
    const { customer } = request;

    const balance = getBalance(customer.statement)

    if(balance < amount) { // se não tiver da erro
        return response.status(400).json({error: "Insuficient funds!"})
    }
    // se tiver os fundos
    const statementOperation = {
        amount,
        created_at: new Date(),
        type: "debit"
    };

    customer.statement.push(statementOperation);

    return response.status(201).send();
})
// filtra pela data
app.get("/statement/date", verifyIfExistsAccountCPF, (request, response) => {
    const { customer } = request;
    const { date } = request.query

    const dateFormat = new Date(date + " 00:00") //formata a data

    const statement = customer.statement.filter((statement) => statement.created_at.toDateString() === new Date
    (dateFormat).toDateString());
    // se ele encontrar algum statement, ele retorna o statement
    return response.json(customer.statement);
});
// atualiza o nome da conta
app.put("/account", verifyIfExistsAccountCPF, (request, response) => {
    const { name } = request.body;
    const { customer } = request;

    customer.name = name;

    return response.status(201).send();
});

app.get("/account", verifyIfExistsAccountCPF, (request, response) => {
    const { customer } = request;

    return response.json(customer);
});

app.delete("/account", verifyIfExistsAccountCPF, (request, response) => {
    const { customer } = request;

    // splice
    customers.splice(customer, 1); // o numero 1 é para remover uma posição a partir do customer

    return response.status(200).json(customers);
});

app.get("/balance", verifyIfExistsAccountCPF, (request, response) => {
    const { customer } = request;

    const balance = getBalance(customer.statement);

    return response.json(balance);
});

app.listen(3333);

