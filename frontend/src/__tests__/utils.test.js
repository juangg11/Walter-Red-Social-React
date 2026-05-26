import { describe, it, expect } from 'vitest';
import { computeVote } from '../utils/computeVote.js';

describe('computeVote utility', () => {
  it('should handle voting up when currently having no vote', () => {
    const result = computeVote({
      currentVote: null,
      voteType: 'up',
      votes: 5,
    });
    expect(result).toEqual({ nextVote: 'up', votes: 6 });
  });

  it('should handle voting down when currently having no vote', () => {
    const result = computeVote({
      currentVote: null,
      voteType: 'down',
      votes: 5,
    });
    expect(result).toEqual({ nextVote: 'down', votes: 4 });
  });

  it('should cancel upvote when voting up again', () => {
    const result = computeVote({
      currentVote: 'up',
      voteType: 'up',
      votes: 5,
    });
    expect(result).toEqual({ nextVote: null, votes: 4 });
  });

  it('should cancel downvote when voting down again', () => {
    const result = computeVote({
      currentVote: 'down',
      voteType: 'down',
      votes: 5,
    });
    expect(result).toEqual({ nextVote: null, votes: 6 });
  });

  it('should switch from down to up vote', () => {
    const result = computeVote({
      currentVote: 'down',
      voteType: 'up',
      votes: 5,
    });
    expect(result).toEqual({ nextVote: 'up', votes: 7 });
  });

  it('should switch from up to down vote', () => {
    const result = computeVote({
      currentVote: 'up',
      voteType: 'down',
      votes: 5,
    });
    expect(result).toEqual({ nextVote: 'down', votes: 3 });
  });

  it('should handle null/undefined votes count gracefully', () => {
    const result = computeVote({
      currentVote: null,
      voteType: 'up',
      votes: null,
    });
    expect(result).toEqual({ nextVote: 'up', votes: 1 });
  });

  it('should never return negative votes', () => {
    const result = computeVote({
      currentVote: 'up',
      voteType: 'up',
      votes: 0,
    });
    expect(result).toEqual({ nextVote: null, votes: 0 });
  });
});
