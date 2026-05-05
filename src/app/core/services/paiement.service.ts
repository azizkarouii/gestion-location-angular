import { inject, Injectable } from '@angular/core';
import {
  addDoc,
  collection,
  collectionData,
  deleteDoc,
  doc,
  Firestore,
  getDocs,
  query,
  updateDoc,
  where,
} from '@angular/fire/firestore';
import { map, Observable } from 'rxjs';
import { Locataire } from '../models/locataire.model';
import { Paiement, StatutPaiement } from '../models/paiement.model';

@Injectable({
  providedIn: 'root'
})
export class PaiementService {
  private readonly firestore = inject(Firestore);

  list(ownerId: string): Observable<Paiement[]> {
    const paiementsRef = collection(this.firestore, 'paiements');
    const paiementsQuery = query(paiementsRef, where('ownerId', '==', ownerId));

    return (collectionData(paiementsQuery, { idField: 'id' }) as Observable<Paiement[]>).pipe(
      map((paiements) => [...paiements].sort((a, b) => this.comparePaiements(b, a)))
    );
  }

  listForLocataire(ownerId: string, locataireId: string): Observable<Paiement[]> {
    const paiementsRef = collection(this.firestore, 'paiements');
    const paiementsQuery = query(
      paiementsRef,
      where('ownerId', '==', ownerId),
      where('locataireId', '==', locataireId)
    );

    return (collectionData(paiementsQuery, { idField: 'id' }) as Observable<Paiement[]>).pipe(
      map((paiements) => [...paiements].sort((a, b) => this.comparePaiements(b, a)))
    );
  }

  async checkDuplicate(ownerId: string, locataireId: string, mois: number, annee: number): Promise<boolean> {
    const paiementsRef = collection(this.firestore, 'paiements');
    const paiementsQuery = query(
      paiementsRef,
      where('ownerId', '==', ownerId),
      where('locataireId', '==', locataireId),
      where('mois', '==', mois),
      where('annee', '==', annee)
    );

    const snapshot = await getDocs(paiementsQuery);
    return snapshot.size > 0;
  }

  async add(paiement: Omit<Paiement, 'id'>): Promise<void> {
    const paiementsRef = collection(this.firestore, 'paiements');
    await addDoc(paiementsRef, {
      ...paiement,
      datePaiement: paiement.datePaiement ?? null,
    });
  }

  async update(id: string, paiement: Partial<Paiement>): Promise<void> {
    const paiementRef = doc(this.firestore, `paiements/${id}`);
    await updateDoc(paiementRef, paiement as any);
  }

  async remove(id: string): Promise<void> {
    const paiementRef = doc(this.firestore, `paiements/${id}`);
    await deleteDoc(paiementRef);
  }

  computeStatut(locataire: Locataire, paiement?: Paiement | null): StatutPaiement {
    if (paiement?.datePaiement) {
      return 'payé';
    }

    const today = new Date();
    const dueDate = new Date(today.getFullYear(), today.getMonth(), locataire.dateEcheance);

    if (today > dueDate) {
      return 'en_retard';
    }

    return 'en_attente';
  }

  isLate(locataire: Locataire, paiement?: Paiement | null): boolean {
    return this.computeStatut(locataire, paiement) === 'en_retard';
  }

  private comparePaiements(first: Paiement, second: Paiement): number {
    const yearDelta = Number(first.annee) - Number(second.annee);
    if (yearDelta !== 0) {
      return yearDelta;
    }

    return Number(first.mois) - Number(second.mois);
  }
}
