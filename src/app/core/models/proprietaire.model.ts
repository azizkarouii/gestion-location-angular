import { Residence } from './residence.model';

export interface Proprietaire {
  id?: string;
  ownerId: string;
  nomComplet: string;
  email: string;
  telephone: string;
  adresse: string;
  residences: Residence[];
  createdAt: any;
  updatedAt?: any;
}
