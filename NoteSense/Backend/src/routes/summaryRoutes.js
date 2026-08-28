import express from "express";
import summaryValidator from "../validators/summaryValidator.js";
import createSummary from "../controllers/summaryController.js";

const summaryRouter = express.Router();

summaryRouter.post("/", summaryValidator, createSummary);

export default summaryRouter;
