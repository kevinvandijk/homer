import expect from 'expect';
import * as actions from '../../../channels/plex/actions';

describe('Plex Actions', () => {
  it('should create a PLAY action', () => {
    const id = 1;
    const expected = { id, type: actions.PLAY };
    expect(actions.play(expected.id)).toEqual(expected);
  });

  it('should create a STOP action for the given id', () => {
    const id = 1;
    const expected = { id, type: actions.STOP };
    expect(actions.stop(expected.id)).toEqual(expected);
  });

  it('should create a PAUSE action for the given id', () => {
    const id = 1;
    const expected = { id, type: actions.PAUSE };
    expect(actions.pause(expected.id)).toEqual(expected);
  });

  it('should create an UPDATE_STATUS action for the given id and status', () => {
    const id = 1;
    const status = { something: 'something' };
    const expected = { id, status, type: actions.UPDATE_STATUS };
    expect(actions.updateStatus(id, status)).toEqual(expected);
  });

  it('should create a SEARCH_MEDIA_REQUEST action and include the id and title', () => {
    const id = 2;
    const title = 'Superdupertitle';
    const expected = {
      type: actions.SEARCH_MEDIA_REQUEST,
      payload: {
        id,
        title,
      },
    };
    expect(actions.searchMedia(id, title)).toEqual(expected);
  });

  it('should create a SEARCH_MEDIA_SUCCESS action with the search result payload', () => {
    const id = 2;
    const results = { search: 'results and stuff' };
    const expected = {
      type: actions.SEARCH_MEDIA_SUCCESS,
      payload: {
        id,
        results,
      },
    };
    expect(actions.searchMediaSuccess(id, results)).toEqual(expected);
  });

  it('should create a SEARCH_MEDIA_FAILURE action with the error in its payload', () => {
    const id = 3;
    const error = new Error('Stupid error :(');
    const expected = {
      type: actions.SEARCH_MEDIA_FAILURE,
      payload: {
        id,
        error,
      },
    };
    expect(actions.searchMediaFailure(id, error)).toEqual(expected);
  });
});
