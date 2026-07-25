import { Router } from "express";
import {
    applyJob, deleteApplication,
    getApplicationByIdWithCandidate, getApplicationByIdWithRecruiter,
    getApplicationCountsForRecruiter, getCandidateApplication,
    getJobApplication, getRecentApplicantsForRecruiter,
    getTotalApplicantsForRecruiter, updateApplication,
    createNotificationInternal

} from "../controllers/application.controller.js";

const router = Router()

router.route("/").post(applyJob)
router.route("/candidate/:candidateId").get(getCandidateApplication)
router.route("/:id/recruiter").get(getApplicationByIdWithRecruiter)
router.route("/recruiter/recent-applicants").get(getRecentApplicantsForRecruiter)
router.route("/recruiter/total-applicants").get(getTotalApplicantsForRecruiter)
router.route("/job/:jobId").get(getJobApplication)
router.route("/:id/candidate").get(getApplicationByIdWithCandidate)
router.route("/recruiter/job-counts").get(getApplicationCountsForRecruiter)
router.route("/:id").put(updateApplication)
router.route("/:id").delete(deleteApplication)
router.post("/internal/create", internalAuth, createNotificationInternal);

export default router