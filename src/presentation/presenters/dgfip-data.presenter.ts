import {defaults, pick} from 'lodash';
import {DgfipOutput} from 'src/domain/data-fetching/data-providers/dgfip/dto';
import {NetworkError} from 'src/domain/data-fetching/errors/network.error';

export class DgfipDataPresenter {
  presentData(input: Partial<DgfipOutput>, withNulls: boolean) {
    const mask = {
      declarant1: {
        nom: '',
        nomNaissance: '',
        prenoms: '',
        dateNaissance: '',
      },
      declarant2: {
        nom: '',
        nomNaissance: '',
        prenoms: '',
        dateNaissance: '',
      },
      foyerFiscal: {
        adresse: '',
      },
      dateRecouvrement: '',
      dateEtablissement: '',
      nombreParts: '',
      situationFamille: '',
      nombrePersonnesCharge: 0,
      revenuBrutGlobal: withNulls ? null : undefined,
      revenuImposable: withNulls ? null : undefined,
      impotRevenuNetAvantCorrections: withNulls ? null : undefined,
      montantImpot: withNulls ? null : undefined,
      revenuFiscalReference: withNulls ? null : undefined,
      erreurCorrectif: '',
      situationPartielle: '',
    };

    return defaults(input, pick(mask, Object.keys(input)));
  }

  presentError(error: Error) {
    if (error instanceof NetworkError) {
      return {
        error: 'not_found',
        reason:
          'Les paramètres fournis sont incorrects ou ne correspondent pas à un avis',
        message:
          'Les paramètres fournis sont incorrects ou ne correspondent pas à un avis',
      };
    }
    return {
      error: error.constructor.name,
      reason: error.message,
      message: 'Erreur interne',
    };
  }
}
