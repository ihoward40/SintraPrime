/**
 * InVideo MCP Integration for AI-powered video generation
 * Uses the InVideo MCP server to create professional videos from scripts
 */

import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export interface VideoGenerationOptions {
  script: string;
  templateId?: string;
  aspectRatio?: "16:9" | "9:16" | "1:1";
  duration?: number;
  voiceOver?: boolean;
  music?: boolean;
}

export interface VideoGenerationResult {
  success: boolean;
  videoId?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
  error?: string;
}

/**
 * Generate a video using InVideo MCP
 */
export async function generateVideo(options: VideoGenerationOptions): Promise<VideoGenerationResult> {
  try {
    const {
      script,
      templateId,
      aspectRatio = "16:9",
      duration,
      voiceOver = true,
      music = true
    } = options;

    // Prepare the input for InVideo MCP
    const input = JSON.stringify({
      script,
      template_id: templateId,
      aspect_ratio: aspectRatio,
      duration,
      voice_over: voiceOver,
      background_music: music
    });

    // Call InVideo MCP tool
    const { stdout, stderr } = await execAsync(
      `manus-mcp-cli tool call generate_video --server invideo --input '${input.replace(/'/g, "\\'")}'`
    );

    if (stderr) {
      console.error("[InVideo] Error:", stderr);
      return {
        success: false,
        error: stderr
      };
    }

    // Parse the result
    const result = JSON.parse(stdout);

    return {
      success: true,
      videoId: result.video_id,
      videoUrl: result.video_url,
      thumbnailUrl: result.thumbnail_url,
      duration: result.duration
    };
  } catch (error) {
    console.error("[InVideo] Video generation failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

/**
 * Get available video templates
 */
export async function getVideoTemplates(): Promise<Array<{ id: string; name: string; description: string }>> {
  try {
    const { stdout } = await execAsync(
      `manus-mcp-cli tool call list_templates --server invideo --input '{}'`
    );

    const result = JSON.parse(stdout);
    return result.templates || [];
  } catch (error) {
    console.error("[InVideo] Failed to fetch templates:", error);
    return [];
  }
}

/**
 * Check video generation status
 */
export async function checkVideoStatus(videoId: string): Promise<{
  status: "processing" | "completed" | "failed";
  progress?: number;
  videoUrl?: string;
}> {
  try {
    const { stdout } = await execAsync(
      `manus-mcp-cli tool call check_status --server invideo --input '${JSON.stringify({ video_id: videoId })}'`
    );

    const result = JSON.parse(stdout);
    return {
      status: result.status,
      progress: result.progress,
      videoUrl: result.video_url
    };
  } catch (error) {
    console.error("[InVideo] Failed to check status:", error);
    return {
      status: "failed"
    };
  }
}

/**
 * Pre-built video script templates for legal marketing
 */
export const VIDEO_SCRIPT_TEMPLATES = {
  fdcpaViolation: {
    title: "FDCPA Violation Explainer",
    description: "Educational video about FDCPA violations and consumer rights",
    script: `[Scene 1 - Opening]
Are debt collectors harassing you? You have rights under the Fair Debt Collection Practices Act.

[Scene 2 - The Problem]
Debt collectors cannot:
- Call you before 8 AM or after 9 PM
- Use threats or abusive language
- Contact you at work if you've told them not to
- Discuss your debt with others

[Scene 3 - Your Rights]
If a debt collector violates the FDCPA, you can:
- Sue for damages up to $1,000
- Recover attorney fees and costs
- Stop the harassment permanently

[Scene 4 - Call to Action]
Don't let debt collectors violate your rights. Contact us today for a free consultation.

[Scene 5 - Closing]
Your rights matter. We're here to help.`
  },
  creditReportDispute: {
    title: "Credit Report Dispute Process",
    description: "Step-by-step guide to disputing credit report errors",
    script: `[Scene 1 - Opening]
Found an error on your credit report? Here's how to fix it.

[Scene 2 - Step 1]
Get your free credit report from AnnualCreditReport.com

[Scene 3 - Step 2]
Identify errors: wrong accounts, incorrect balances, or outdated information

[Scene 4 - Step 3]
File a dispute with the credit bureau in writing

[Scene 5 - Step 4]
The bureau has 30 days to investigate

[Scene 6 - Your Rights]
If they don't fix it, you may have a case under the Fair Credit Reporting Act

[Scene 7 - Call to Action]
We can help you fight back. Free consultation available.

[Scene 8 - Closing]
Protect your credit. Protect your future.`
  },
  consumerProtection: {
    title: "Consumer Protection Overview",
    description: "General consumer rights and protections video",
    script: `[Scene 1 - Opening]
Know your consumer rights. We're here to protect you.

[Scene 2 - Fair Debt Collection]
Debt collectors must follow strict rules. Harassment is illegal.

[Scene 3 - Credit Reporting]
Errors on your credit report can cost you thousands. You have the right to accurate reporting.

[Scene 4 - Identity Theft]
If someone steals your identity, federal law protects you from fraudulent charges.

[Scene 5 - Scams and Fraud]
Don't fall victim to scams. Know the warning signs.

[Scene 6 - Your Legal Options]
When companies violate your rights, you can take legal action.

[Scene 7 - Call to Action]
Contact us for a free case evaluation. We fight for consumers.

[Scene 8 - Closing]
Your rights. Our mission.`
  },
  caseSuccess: {
    title: "Case Success Story",
    description: "Template for showcasing successful case outcomes",
    script: `[Scene 1 - Opening]
Real results for real people. Here's how we helped.

[Scene 2 - The Problem]
Our client was harassed by debt collectors making illegal threats.

[Scene 3 - Our Action]
We filed a lawsuit under the Fair Debt Collection Practices Act.

[Scene 4 - The Result]
$15,000 settlement. Harassment stopped immediately.

[Scene 5 - Client Impact]
Peace of mind restored. Credit score improved.

[Scene 6 - Your Case]
You could be entitled to compensation too.

[Scene 7 - Call to Action]
Free consultation. No upfront costs. We only get paid if you win.

[Scene 8 - Closing]
Let us fight for you.`
  },
  serviceOverview: {
    title: "Law Firm Services Overview",
    description: "Introduction to your law firm's services",
    script: `[Scene 1 - Opening]
Welcome to [Your Firm Name]. We fight for consumer rights.

[Scene 2 - Who We Are]
Experienced consumer protection attorneys with a track record of success.

[Scene 3 - What We Do]
- FDCPA violations
- Credit report errors
- Identity theft
- Consumer fraud

[Scene 4 - How We Work]
Free consultation. No upfront fees. We only get paid when you win.

[Scene 5 - Our Results]
Millions recovered for clients. Thousands of cases won.

[Scene 6 - Why Choose Us]
Personalized attention. Aggressive representation. Proven results.

[Scene 7 - Call to Action]
Call now for your free case evaluation.

[Scene 8 - Closing]
Your rights. Our priority.`
  },
  clientOnboarding: {
    title: "New Client Welcome Video",
    description: "Welcome video for new clients explaining the process",
    script: `[Scene 1 - Opening]
Welcome to our firm! We're excited to represent you.

[Scene 2 - What to Expect]
Here's what happens next in your case.

[Scene 3 - Step 1: Documentation]
We'll gather all necessary documents and evidence.

[Scene 4 - Step 2: Investigation]
Our team will thoroughly investigate your claim.

[Scene 5 - Step 3: Legal Action]
We'll file your case and fight for maximum compensation.

[Scene 6 - Communication]
You'll receive regular updates throughout the process.

[Scene 7 - Your Role]
Stay in touch and provide information when requested.

[Scene 8 - Closing]
We're here for you every step of the way.`
  },
  courtPreparation: {
    title: "Court Preparation Guide",
    description: "Video to help clients prepare for court appearances",
    script: `[Scene 1 - Opening]
Preparing for court? Here's what you need to know.

[Scene 2 - Before Court]
Arrive 30 minutes early. Dress professionally. Bring required documents.

[Scene 3 - Courtroom Etiquette]
Stand when the judge enters. Address the judge as "Your Honor." Turn off your phone.

[Scene 4 - Testimony Tips]
Speak clearly. Answer only what's asked. Tell the truth.

[Scene 5 - What to Expect]
The other side will present their case. We'll present ours. The judge will decide.

[Scene 6 - After Court]
We'll discuss the outcome and next steps.

[Scene 7 - Questions]
Don't hesitate to ask us anything before your court date.

[Scene 8 - Closing]
We'll be right there with you.`
  },
  legalEducation: {
    title: "Understanding Your Legal Rights",
    description: "Educational video about consumer legal rights",
    script: `[Scene 1 - Opening]
Knowledge is power. Learn your legal rights.

[Scene 2 - Right to Fair Treatment]
Companies must treat you fairly under consumer protection laws.

[Scene 3 - Right to Accurate Information]
You have the right to accurate credit reporting and debt information.

[Scene 4 - Right to Privacy]
Your personal information is protected by federal law.

[Scene 5 - Right to Dispute]
You can dispute errors and challenge unfair practices.

[Scene 6 - Right to Legal Action]
When your rights are violated, you can sue for damages.

[Scene 7 - Getting Help]
Consumer protection attorneys can help you enforce your rights.

[Scene 8 - Closing]
Don't let anyone take advantage of you.`
  },
  socialMediaShort: {
    title: "Social Media Quick Tip",
    description: "Short-form video for TikTok, Instagram Reels, YouTube Shorts",
    script: `[Scene 1 - Hook]
Debt collector won't stop calling? Here's what to do.

[Scene 2 - The Law]
Under the FDCPA, you can tell them to stop contacting you.

[Scene 3 - How to Do It]
Send a written cease and desist letter.

[Scene 4 - What Happens]
They must stop all contact except to confirm receipt or notify you of legal action.

[Scene 5 - Your Rights]
If they continue, you can sue for up to $1,000 plus attorney fees.

[Scene 6 - Call to Action]
Need help? Link in bio for free consultation.`
  },
  testimonialGuide: {
    title: "Client Testimonial Template",
    description: "Template for creating client testimonial videos",
    script: `[Scene 1 - Introduction]
[Client Name] shares their experience with our firm.

[Scene 2 - The Problem]
"I was being harassed by debt collectors every day."

[Scene 3 - Finding Help]
"I found [Firm Name] online and called for a free consultation."

[Scene 4 - The Process]
"They explained everything clearly and handled my case professionally."

[Scene 5 - The Outcome]
"We won $12,000 and the harassment stopped immediately."

[Scene 6 - Recommendation]
"I highly recommend [Firm Name] to anyone dealing with debt collector abuse."

[Scene 7 - Closing]
Real clients. Real results. Contact us today.`
  },
  bankruptcyAlternatives: {
    title: "Bankruptcy Alternatives Explained",
    description: "Video explaining alternatives to bankruptcy",
    script: `[Scene 1 - Opening]
Bankruptcy isn't your only option. Explore alternatives.

[Scene 2 - Debt Settlement]
Negotiate with creditors to reduce what you owe.

[Scene 3 - Debt Consolidation]
Combine multiple debts into one lower payment.

[Scene 4 - Credit Counseling]
Work with certified counselors to create a repayment plan.

[Scene 5 - Debt Validation]
Challenge debts you don't owe or that are past the statute of limitations.

[Scene 6 - Legal Action]
Sue creditors who violate your rights under the FDCPA.

[Scene 7 - Which is Right]
Every situation is different. We can help you decide.

[Scene 8 - Call to Action]
Free consultation to discuss your options.`
  },
  urgentAction: {
    title: "Urgent Action Required",
    description: "Video for time-sensitive legal matters",
    script: `[Scene 1 - Urgent Alert]
⚠️ URGENT: Don't ignore this if you're facing debt collection.

[Scene 2 - The Deadline]
You may have limited time to respond to a lawsuit or collection action.

[Scene 3 - What Happens If You Ignore It]
Default judgment. Wage garnishment. Bank account levy.

[Scene 4 - Take Action Now]
Contact a consumer protection attorney immediately.

[Scene 5 - We Can Help]
Free consultation. Same-day response. Experienced representation.

[Scene 6 - Your Options]
We'll review your case and explain all available defenses.

[Scene 7 - Call to Action]
Don't wait. Call now: [Phone Number]

[Scene 8 - Closing]
Time is running out. Act today.`
  },
  identityTheftRecovery: {
    title: "Identity Theft Recovery Steps",
    description: "Guide for recovering from identity theft",
    script: `[Scene 1 - Opening]
Victim of identity theft? Here's your recovery roadmap.

[Scene 2 - Step 1: Report It]
File a report with the FTC at IdentityTheft.gov

[Scene 3 - Step 2: Credit Freeze]
Freeze your credit with all three bureaus immediately.

[Scene 4 - Step 3: Dispute Fraudulent Accounts]
Contact creditors and dispute all fraudulent charges.

[Scene 5 - Step 4: File Police Report]
Get an official police report for your records.

[Scene 6 - Step 5: Monitor Your Credit]
Check your credit reports regularly for new fraudulent activity.

[Scene 7 - Legal Protection]
You're not liable for fraudulent charges under federal law.

[Scene 8 - Get Help]
We can help you fight back and recover damages.`
  },
  classActionInvite: {
    title: "Class Action Lawsuit Invitation",
    description: "Video inviting potential plaintiffs to join a class action",
    script: `[Scene 1 - Opening]
Were you affected by [Company Name]'s illegal practices?

[Scene 2 - The Problem]
[Company Name] violated federal law by [describe violation].

[Scene 3 - Class Action Filed]
We've filed a class action lawsuit on behalf of all affected consumers.

[Scene 4 - Who Can Join]
If you [describe criteria], you may be entitled to compensation.

[Scene 5 - No Cost to Join]
There's no cost to join the class action. We only get paid if we win.

[Scene 6 - Potential Recovery]
Class members could receive [describe potential compensation].

[Scene 7 - How to Join]
Visit [website] or call [phone number] to join the lawsuit.

[Scene 8 - Deadline]
Act now. There's a deadline to join.`
  }
};

/**
 * Generate video from template
 */
export async function generateVideoFromTemplate(
  templateKey: keyof typeof VIDEO_SCRIPT_TEMPLATES,
  customizations?: Partial<VideoGenerationOptions>
): Promise<VideoGenerationResult> {
  const template = VIDEO_SCRIPT_TEMPLATES[templateKey];
  
  return generateVideo({
    script: template.script,
    aspectRatio: "16:9",
    voiceOver: true,
    music: true,
    ...customizations
  });
}
