import { ADD_CONNECTOR } from '../../actions';
import { UPDATE_STATUS } from './actions';

const initialState = {};

export default function reducer(state = initialState, action) {
  switch (action.type) {
    case ADD_CONNECTOR:
      return {
        ...state,
        [action.id]: {
          id: action.id,
          connectorType: action.connectorType,
          name: action.name,
        },
      };
    case UPDATE_STATUS:
      return {
        ...state,
        [action.id]: {
          ...state.id,
          status: action.status,
        },
      };
    default:
      return state;
  }
}
