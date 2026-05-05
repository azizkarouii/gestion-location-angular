import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { LoginComponent } from './features/auth/login/login.component';
import { SignupComponent } from './features/auth/signup/signup.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { ListLocatairesComponent } from './features/locataires/list-locataires/list-locataires.component';
import { AddLocataireComponent } from './features/locataires/add-locataire/add-locataire.component';
import { HistoriquePaiementsComponent } from './features/paiements/historique-paiements/historique-paiements.component';
import { AddPaiementComponent } from './features/paiements/add-paiement/add-paiement.component';
import { ProfilProprietaireComponent } from './features/proprietaire/profil-proprietaire.component';
import { ManageResidencesComponent } from './features/residences/manage-residences.component';

export const routes: Routes = [
	{ path: 'login', component: LoginComponent },
	{ path: 'signup', component: SignupComponent },
	{
		path: '',
		canActivate: [authGuard],
		children: [
			{ path: '', pathMatch: 'full', redirectTo: 'dashboard' },
			{ path: 'dashboard', component: DashboardComponent },
			{ path: 'locataires', component: ListLocatairesComponent },
			{ path: 'locataires/ajouter', component: AddLocataireComponent },
			{ path: 'paiements', component: HistoriquePaiementsComponent },
			{ path: 'paiements/ajouter', component: AddPaiementComponent },
			{ path: 'residences', component: ManageResidencesComponent },
			{ path: 'profil-proprietaire', component: ProfilProprietaireComponent },
		],
	},
	{ path: '**', redirectTo: '' },
];
