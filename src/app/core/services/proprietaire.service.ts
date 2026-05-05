import { inject, Injectable } from '@angular/core';
import { collection, collectionData, doc, docData, Firestore, setDoc, updateDoc, query, where } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Proprietaire } from '../models/proprietaire.model';

@Injectable({
  providedIn: 'root'
})
export class ProprietaireService {
  private readonly firestore = inject(Firestore);

  getByOwnerId(ownerId: string): Observable<Proprietaire | undefined> {
    const proprietaireRef = doc(this.firestore, `proprietaires/${ownerId}`);
    return docData(proprietaireRef, { idField: 'id' }) as Observable<Proprietaire | undefined>;
  }

  async createOrUpdate(proprietaire: Proprietaire): Promise<void> {
    const proprietaireRef = doc(this.firestore, `proprietaires/${proprietaire.ownerId}`);
    await setDoc(proprietaireRef, {
      ...proprietaire,
      updatedAt: new Date(),
    }, { merge: true });
  }

  async update(ownerId: string, data: Partial<Proprietaire>): Promise<void> {
    const proprietaireRef = doc(this.firestore, `proprietaires/${ownerId}`);
    await updateDoc(proprietaireRef, {
      ...data,
      updatedAt: new Date(),
    });
  }
}
