import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddPaiementComponent } from './add-paiement.component';

describe('AddPaiementComponent', () => {
  let component: AddPaiementComponent;
  let fixture: ComponentFixture<AddPaiementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddPaiementComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AddPaiementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
