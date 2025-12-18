declare module 'country-state-city' {
  export type Country = {
    name: string;
    isoCode: string;
    phonecode?: string;
    currency?: string;
    latitude?: string;
    longitude?: string;
    flag?: string;
  };

  export type State = {
    name: string;
    isoCode: string;
    countryCode: string;
    latitude?: string;
    longitude?: string;
  };

  export type City = {
    name: string;
    countryCode: string;
    stateCode: string;
    latitude?: string;
    longitude?: string;
  };

  export const Country: {
    getAllCountries(): Country[];
  };

  export const State: {
    getStatesOfCountry(countryCode: string): State[];
  };

  export const City: {
    getCitiesOfState(countryCode: string, stateCode: string): City[];
  };
}
