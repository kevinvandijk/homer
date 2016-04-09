import { expect } from 'chai';
import * as actions from '../../../channels/plex/actions';

describe('Homer Plex', () => {
  describe('Actions', () => {
    it('should create a PLAY action', () => {
      const id = 1;
      const expected = { id, type: actions.PLAY };
      expect(actions.play(expected.id)).to.eql(expected);
    });

    it('should create a STOP action for the given id', () => {
      const id = 1;
      const expected = { id, type: actions.STOP };
      expect(actions.stop(expected.id)).to.eql(expected);
    });

    it('should create a PAUSE action for the given id', () => {
      const id = 1;
      const expected = { id, type: actions.PAUSE };
      expect(actions.pause(expected.id)).to.eql(expected);
    });

    it('should create an UPDATE_STATUS action for the given id and status', () => {
      const id = 1;
      const status = { something: 'something' };
      const expected = { id, status, type: actions.UPDATE_STATUS };
      expect(actions.updateStatus(id, status)).to.eql(expected);
    });
  });
});
