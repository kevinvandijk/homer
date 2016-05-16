// import { ADD_CONNECTOR } from '../../actions';
import { UPDATE_STATUS, SEARCH_MEDIA_SUCCESS } from './actions';

const initialState = {};

export default function reducer(state = initialState, action) {
  switch (action.type) {
    case UPDATE_STATUS:
      return {
        ...state,
        [action.id]: {
          ...state.id,
          status: action.status,
        },
      };

    case SEARCH_MEDIA_SUCCESS: {
      const { query, results } = action.payload;

      return {
        ...state,
        search: {
          ...state.search,
          [query]: results,
        },
      };
    }

    default:
      console.log('hit reducer with', action.type);
      // console.log('payload', action.payload);
      return state;
  }
}
