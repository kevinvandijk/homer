import expect from 'expect';
import deepFreeze from 'deep-freeze';
import * as actions from '../../../channels/plex/actions';
import reducer from '../../../channels/plex/reducer';

describe('Homer Plex Reducer', () => {
  // const oldState = {
  //   so
  // }
  it('returns the initial state', () => {
    const action = deepFreeze({});

    expect(reducer(undefined, action)).toEqual({});
  });

  it('handles UPDATE_STATUS', () => {
    const prevState = deepFreeze({
      3: {
        status: 'stopped',
      },
      4: {
        status: 'stopped',
      },
    });
    const action = deepFreeze({
      type: actions.UPDATE_STATUS,
      id: 3,
      status: 'playing',
    });
    const expected = {
      3: {
        status: 'playing',
      },
      4: {
        status: 'stopped',
      },
    };

    expect(reducer(prevState, action)).toEqual(expected);
  });
});
