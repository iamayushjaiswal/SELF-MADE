import summaryModel from "../models/summary.model.js";
async function createSummary(req,res){

const text=req.body.text;

await summaryModel.create({
    originalText:text,
    summary:"This is a fake summary"
})

res.status(201).json({
    success:true,
    message:"Summary created"
})


}

export default createSummary;