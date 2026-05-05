import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HistoriquePaiementsComponent } from './historique-paiements.component';

describe('HistoriquePaiementsComponent', () => {
  let component: HistoriquePaiementsComponent;
  let fixture: ComponentFixture<HistoriquePaiementsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HistoriquePaiementsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(HistoriquePaiementsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
