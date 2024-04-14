const { createBot, createProvider, createFlow, addKeyword } = require('@bot-whatsapp/bot')
const axios = require('axios');
const fs = require('fs');

const QRPortalWeb = require('@bot-whatsapp/portal')
const BaileysProvider = require('@bot-whatsapp/provider/baileys')
const MockAdapter = require('@bot-whatsapp/database/mock')

const enviarArchivo = addKeyword('RECIBO_GENERADO')
        .addAction(async(ctx, {flowDynamic}) => {
            await flowDynamic([
                {
                    body:"soy una imagen",
                    media:'c:/Sitios/base-baileys-memory/recibos/ReciboHaberes.pdf',
                    delay:5000
                }
                ]) 
        })


const flowString = addKeyword('recibo')
    .addAnswer('Generando el Recibo.', null, async (ctx, { state })=> {
        await state.update({ telefono: ctx.from}) 
        console.log(state.get('telefono'))
    })
    .addAnswer(
    'Confirma S/N',
    {capture:true},
    async (ctx, { state,gotoFlow} )=>{
        //const telefono = '5492995805112'
        const telefono = state.get('telefono')
        console.log('Generando Recibo')
        axios.get(`http://localhost:3001/generate_pdf/${telefono}`, {responseType: 'stream'})
          .then(response => {
            // Guardar el PDF en un archivo
            fs.unlink('c:/Sitios/base-baileys-memory/recibos/'+telefono+'.pdf',(err)=>{if (err) console.error('Error:', err)});
            const writer = fs.createWriteStream('recibos/'+telefono+'.pdf');
            response.data.pipe(writer);
            
            writer.on('finish', () => {
                console.log('Archivo descargado exitosamente.')
                //gotoFlow(enviarArchivo) --No anda no se porque
              });
            writer.on('error', (err) => {
                console.error('Error al escribir el archivo:', err);
              });            
              
          })
          .catch(error => console.error('Error:', error));   
         }
    )
    .addAnswer('Recibo Generado', null, async (ctx, {state,flowDynamic}) =>{
        await flowDynamic([
            {
                body:"soy una imagen",
                media:`c:/Sitios/base-baileys-memory/recibos/${state.get('telefono')}.pdf`,
                delay:5000
            }
            ]) 
    }) 
  /*  .addAnswer('Envia Recibo', {
     media: 'c:/Sitios/base-baileys-memory/recibos/ReciboHaberes.pdf', 
    })*/

         

const flowPrincipal = addKeyword(['rrhh'])
    .addAnswer('🙌 Hola bienvenido a este *Chatbot de Recursos Humanos*')
    .addAnswer(
        [
            'Que estas necesitando? ingresa la palabra remarcada (recibo, fecha o gracias)',
            '👉 *recibo* para ver tu ultimo recibo',
            '👉 *fecha* para ver la fecha de pago',
            '👉 *gracias* para finalizar',
        ],
        {capture:true},
        async (ctx, { state }) => {
            await state.update({ telefono: ctx.from })
        },
        [flowString]
    )

const main = async () => {
    const adapterDB = new MockAdapter()
    const adapterFlow = createFlow([flowPrincipal])
    const adapterProvider = createProvider(BaileysProvider)

    createBot({
        flow: adapterFlow,
        provider: adapterProvider,
        database: adapterDB,
    })

    QRPortalWeb()
}

main()
