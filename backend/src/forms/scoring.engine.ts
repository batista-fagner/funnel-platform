import { LeadClassification } from '../common/entities/lead.entity';

export interface ScoringResponse {
  score: number;
  classification: LeadClassification;
}

export interface FormResponses {
  revenueRange?: string;
  hasPain?: boolean;
  budget?: number;
  vslPercentage?: number;
}

export class ScoringEngine {
  score(responses: FormResponses): ScoringResponse {
    let pts = 0;

    if (responses.revenueRange === '100k+' || responses.revenueRange === '30k-100k') pts += 40;
    else if (responses.revenueRange === '10k-30k') pts += 25;

    if (responses.hasPain) pts += 20;

    if (responses.budget && responses.budget >= 200) pts += 15;

    if (responses.vslPercentage && responses.vslPercentage >= 75) pts += 25;

    let classification: LeadClassification = 'frio';
    if (pts >= 100) classification = 'otimo';
    else if (pts >= 60) classification = 'bom';

    return { score: pts, classification };
  }
}
