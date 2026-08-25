export function createDiceSequenceRandomInt(
  values
) {

  const calls =
    [];

  let index =
    0;

  return {
    calls,
    randomInt(
      minInclusive,
      maxInclusive
    ) {

      calls.push([
        minInclusive,
        maxInclusive
      ]);

      if (
        index >= values.length
      ) {

        throw new Error(
          'Dice test RNG sequence exhausted'
        );
      }

      const value =
        values[index];

      index += 1;

      return value;
    },
    get consumed() {

      return index;
    },
    get remaining() {

      return (
        values.length - index
      );
    }
  };
}
