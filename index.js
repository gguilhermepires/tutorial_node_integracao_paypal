// npm install paypal-rest-sdk

const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const paypal = require("paypal-rest-sdk");
const DateFormat = require("dateformat");

// View engine
app.set('view engine', 'ejs');

//Body parser
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

paypal.configure({
    'mode': 'sandbox', //sandbox or live
    'client_id': 'cU071wqBd5TjgYDhN8_miFtiEW-Q1QccEv6KA7RVHMw4k_vI3NP4DJcl9Kl1Povg63jOxqqIVty-D4Oc',
    'client_secret': 'fGSDD1ZSyHjKmChqVI-qlfyo6vSSgvdZC5T-s-yawgWHnCA5T0HpCfHrhgYAkemobYRNbRDDyKCKaS9s'
});

app.get("/", (req, res) => {
    res.render("index");
});
app.post("/comprar", (req, res) => {

    var { email, id } = req.body;

    var { name, price, amount } = req.body;

    var total = price * amount;

    var pagamento = {
        "intent": "sale",
        "payer": {
            "payment_method": "paypal"
        },
        "redirect_urls": {
            "return_url": `http://localhost:45567/final?email=${email}&id=${id}&total=${total}`,
            "cancel_url": "http://cancel.url"
        },
        "transactions": [{
            "item_list": {
                "items": [{
                    "name": name,
                    "sku": name,  //id do produto
                    "price": price,
                    "currency": "BRL",
                    "quantity": amount
                }]
            },
            "amount": {
                "currency": "BRL",
                "total": total
            },
            "description": "Descricao"
        }]
    };

    paypal.payment.create(pagamento, function (error, payment) {
        if (error) {
            console.log("erro");

        } else {
            //console.log("Create Payment Response");
            //console.log(payment);
            for (var i = 0; i < payment.links.length; i++) {
                var p = payment.links[i];
                if (p.rel === 'approval_url') {
                    res.redirect(p.href);
                }
            }
        }
    });


});
app.get("/final", (req, res) => {
    // url de exemplo    http://return.url/?paymentId=PAYID-L222WNA7KD32964PX6398634&token=EC-89Y606782X166002X&PayerID=6GWH3F5CEWH5W
    var email = req.query.email;
    var id = req.query.id;
    var total = req.query.total;
    var paymentId = req.query.paymentId;
    var PayerID = req.query.PayerID;
    var final = {
        "payer_id": PayerID,
        "transactions": [{
            "amount": {
                "currency": "BRL",
                "total": total
            }
        }]
    };

    paypal.payment.execute(paymentId, final, (erro, payment) => {
        if (erro) {
            console.log("erro na execução do pagamento", erro);
            res.json(erro);
        } else {
            res.json(payment);
        }
    })

});
//************************************* criação de planos ********************************************************* */
app.get("/list", (req, res) => {
    //paypal.billingPlan.list({}, (err, plans) => {  pega planos inativos

    paypal.billingPlan.list({ "status": "ACTIVE" }, (err, plans) => {
        if (err) {
            console.log(err);
            res.json({});
        } else {
            res.json(plans);
        }
    });
});

app.get("/active/:id", (req, res) => {
    var mudancas =
        [
            {
                "op": "replace",
                "path": "/",
                "value": {
                    "state": "ACTIVE" // INACTIVE
                }
            }

        ];

    var id = req.params.id;

    paypal.billingPlan.update(id, mudancas, (err, result) => {
        if (err) {
            console.log(err);
            res.send(err);
        } else {
            res.send("mudança feita");
        }

    })
});

app.get("/create", (req, res) => {
    var plan = {
        "name": "Testing1-Regular1",
        "description": "Create Plan for Regular",
        "merchant_preferences": {
            "auto_bill_amount": "yes",
            "cancel_url": "http://www.cancel.com",
            "initial_fail_amount_action": "continue",
            "max_fail_attempts": "1",
            "return_url": "http://www.success.com",
            "setup_fee": { // uma taxa de configuracao
                "currency": "BRL",
                "value": "0"
            }
        },

        "payment_definitions": [ //só pode ter um ciclo trial

            {
                "amount": {
                    "currency": "BRL",
                    "value": "0"
                },
                "cycles": "7",
                "frequency": "DAY",
                "frequency_interval": "1",
                "name": "Teste gratis",
                "type": "TRIAL"
            },

            {
                "amount": {
                    "currency": "BRL",
                    "value": "24"
                },

                "cycles": "0", // zero porque o type é INFINIT
                "frequency": "MONTH",
                "frequency_interval": "1",
                "name": "Regular prata",
                "type": "REGULAR"
            }
        ],
        "type": "INFINITE" // vai durar até o cliente cancelar
        // "type": "FIXED" // vai durar de acordo com os cycles
    };

    paypal.billingPlan.create(plan, (err, plan) => {
        if (err) {
            console.log("erro ao criar plano");
            res.json(err);
        }
        else {
            console.log("criou o plano");
            console.log(plan);
            res.json(plan);
        }

    });

});
function getPaypalDate() {
    var df = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ssZ");

    // Add 30 seconds to make sure Paypal accept the agreement date
    var rightNow = new Date(new Date().getTime() + 30000);

    return df.format(rightNow);
}
app.post("/sub", (req, res) => {
    var email = req.body.client_email;
    var plan_id = "P-29E50707DV597944T6XORFOQ";

    var isoDate = new Date(Date.now());
    isoDate.setSeconds(isoDate.getSeconds() + 40);
    isoDate.toISOString().slice(0, 19) + 'Z';

    //"2017-12-22T09:13:49Z"
    var dadosAssinatura = {
        "name": "Assinatura do plano prata",
        "description": "descricao",
        "start_date": "2020-10-10T09:13:49Z",
        "payer": {
            "payment_method": "paypal"
        },
        "plan": {
            "id": plan_id
        },
        "override_merchant_preferences": {
            "return_url": `http://localhost:45567/subreturn?email=${email}`,
            "cancel_url": ""
        }
    }

    paypal.billingAgreement.create(dadosAssinatura, (err, assinature) => {
        if (err)
            res.json(err)
        else {

            for (var i = 0; i < assinature.links.length; i++) {
                var p = assinature.links[i];
                if (p.rel === 'approval_url') {
                    res.redirect(p.href);
                }
            }
        }
    })
});
app.get("/subreturn", (req, res) => {
    var email = req.query.email;
    var token = req.query.token;
    paypal.billingAgreement.execute(token, {}, (err, assinatura) => {
        if (err) {
            res.json(err);
        }else{
            res.send("Assinatura realizada com sucesso, email:"+email+ "id assinatura:"+ assinatura.id);
        }
    })

});

app.get("/info/:id", (req, res) => {
    //:I-5C38GEBYW398
    var id = req.params.id;
    paypal.billingAgreement.get(id,(erro,assinantura)=>{
        if(erro)
        console.log(erro);
        else{
            res.json(assinantura)
        }
    })

});

app.get("/cancel/:id", (req, res) => {
    //:I-5C38GEBYW398
    var id = req.params.id;
    paypal.billingAgreement.cancel(id,{"note":"nota esclareceimento aqui"},(erro,response)=>{
        if(erro)
        console.log(erro);
        else{
            res.json({resposta:response, msg:"cancelada com sucesso"});
        }
    })
});


//******************************************************************************************************************** */
app.listen(45567, () => {
    console.log("Running!")
})

