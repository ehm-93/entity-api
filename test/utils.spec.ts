import {describe, test} from 'mocha';
import {assert} from 'chai';
import * as utils from '../src/utils';

describe('format', () => {
    test('fixture', () => {
        const expectation = 'This is {"a":"test"} 1 1 2 test 123 [{"another":"test"}] {5}';
        const formatStr = 'This is {0} {1} {1} {2} {3} {4} {5}';

        assert.equal(utils.format(formatStr, {a: 'test'}, 1, 2, 'test 123', [{another: 'test'}]), expectation);
    });
});