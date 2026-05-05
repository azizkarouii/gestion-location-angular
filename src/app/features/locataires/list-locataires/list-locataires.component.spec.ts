import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListLocatairesComponent } from './list-locataires.component';

describe('ListLocatairesComponent', () => {
  let component: ListLocatairesComponent;
  let fixture: ComponentFixture<ListLocatairesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListLocatairesComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ListLocatairesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
