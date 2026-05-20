export interface Company {
  id: string;
  name: string;
  number: number;
  region: string;
  city: string;
  address: string;
  phone?: string;
  email?: string;
  isActive: boolean;
  createdAt: string;
}

export interface CreateCompanyDto {
  name: string;
  number: number;
  region: string;
  city: string;
  address: string;
  phone?: string;
  email?: string;
}

export interface UpdateCompanyDto extends Partial<CreateCompanyDto> {}
