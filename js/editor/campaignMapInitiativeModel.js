export class CampaignMapInitiativeModel {

  constructor(
    data = {}
  ) {

    this.participants =
      normalizeParticipants(
        data.participants
      );

    this.activeParticipantId =
      normalizeText(
        data.activeParticipantId
      ) ||
      this.participants[0]?.participantId ||
      '';
  }


  static fromTokens(
    tokens = [],
    options = {}
  ) {

    const aliveOnly =
      options.aliveOnly !== false;

    return new CampaignMapInitiativeModel({
      participants:
        tokens
          .filter(token =>
            !aliveOnly ||
            isTokenAlive(
              token
            )
          )
          .map(token =>
            createParticipantFromToken(
              token
            )
          )
    });
  }


  addParticipant(
    data
  ) {

    const participant =
      normalizeParticipant(
        data
      );

    if (!participant.participantId) return null;

    const existing =
      this.getParticipant(
        participant.participantId
      );

    if (existing) {

      Object.assign(
        existing,
        participant
      );

      return existing;
    }

    this.participants.push(
      participant
    );

    if (!this.activeParticipantId) {

      this.activeParticipantId =
        participant.participantId;
    }

    return participant;
  }


  removeParticipant(
    participantId
  ) {

    const normalizedId =
      normalizeText(
        participantId
      );

    const before =
      this.participants.length;

    this.participants =
      this.participants.filter(participant =>
        participant.participantId !== normalizedId
      );

    if (this.activeParticipantId === normalizedId) {

      this.activeParticipantId =
        this.participants[0]?.participantId || '';
    }

    return before !== this.participants.length;
  }


  getParticipant(
    participantId
  ) {

    const normalizedId =
      normalizeText(
        participantId
      );

    return this.participants.find(participant =>
      participant.participantId === normalizedId
    ) || null;
  }


  rollParticipant(
    participantId,
    roll = rollD20()
  ) {

    const participant =
      this.getParticipant(
        participantId
      );

    if (!participant) return null;

    participant.roll =
      clampD20(
        roll
      );

    participant.total =
      participant.roll + participant.modifier;

    return participant;
  }


  rollAll(
    random = Math.random
  ) {

    this.participants.forEach(participant => {

      this.rollParticipant(
        participant.participantId,
        rollD20(
          random
        )
      );
    });

    this.sortByInitiative();

    return this.participants;
  }


  sortByInitiative() {

    this.participants.sort((left, right) => {

      if (right.total !== left.total) {

        return right.total - left.total;
      }

      if (right.modifier !== left.modifier) {

        return right.modifier - left.modifier;
      }

      return left.name.localeCompare(
        right.name,
        'ru'
      );
    });

    if (
      this.activeParticipantId &&
      !this.getParticipant(
        this.activeParticipantId
      )
    ) {

      this.activeParticipantId =
        this.participants[0]?.participantId || '';
    }

    return this.participants;
  }


  setActive(
    participantId
  ) {

    const participant =
      this.getParticipant(
        participantId
      );

    if (!participant) return null;

    this.activeParticipantId =
      participant.participantId;

    return participant;
  }


  nextTurn() {

    return this.shiftTurn(
      1
    );
  }


  previousTurn() {

    return this.shiftTurn(
      -1
    );
  }


  shiftTurn(
    offset
  ) {

    if (!this.participants.length) return null;

    const currentIndex =
      Math.max(
        0,
        this.participants.findIndex(participant =>
          participant.participantId === this.activeParticipantId
        )
      );

    const nextIndex =
      (currentIndex + offset + this.participants.length) %
      this.participants.length;

    this.activeParticipantId =
      this.participants[nextIndex].participantId;

    return this.participants[nextIndex];
  }


  toJSON() {

    return {
      participants:
        this.participants.map(participant => ({
          ...participant
        })),
      activeParticipantId:
        this.activeParticipantId
    };
  }
}


export function createParticipantFromToken(
  token = {}
) {

  const tokenId =
    normalizeText(
      token.tokenId
    );

  return normalizeParticipant({
    participantId:
      tokenId
        ? `token:${tokenId}`
        : '',
    tokenId,
    pageId:
      token.pageId,
    sourceMode:
      token.sourceMode,
    name:
      token.name || token.dataset?.name || 'Участник',
    modifier:
      token.initiativeModifier ?? token.modifier ?? 0,
    isAlive:
      isTokenAlive(
        token
      )
  });
}


export function isTokenAlive(
  token = {}
) {

  const hp =
    token.hp ?? token.currentHp ?? token.dataset?.hp;

  if (hp === undefined || hp === null || hp === '') return true;

  return Number(hp) > 0;
}


export function rollD20(
  random = Math.random
) {

  return Math.floor(
    random() * 20
  ) + 1;
}


function normalizeParticipants(
  participants = []
) {

  return Array.isArray(
    participants
  )
    ? participants
      .map(normalizeParticipant)
      .filter(participant =>
        participant.participantId
      )
    : [];
}


function normalizeParticipant(
  data = {}
) {

  const roll =
    normalizeNumber(
      data.roll
    );

  const modifier =
    normalizeNumber(
      data.modifier
    );

  return {
    participantId:
      normalizeText(
        data.participantId
      ),
    tokenId:
      normalizeText(
        data.tokenId
      ),
    pageId:
      normalizeText(
        data.pageId
      ),
    sourceMode:
      normalizeText(
        data.sourceMode
      ) || 'duplicate',
    name:
      normalizeText(
        data.name
      ) || 'Участник',
    modifier,
    roll,
    total:
      normalizeNumber(
        data.total,
        roll + modifier
      ),
    isAlive:
      data.isAlive !== false
  };
}


function clampD20(
  value
) {

  return Math.min(
    20,
    Math.max(
      1,
      normalizeNumber(
        value,
        1
      )
    )
  );
}


function normalizeNumber(
  value,
  fallback = 0
) {

  const number =
    Number(value);

  return Number.isFinite(
    number
  )
    ? number
    : fallback;
}


function normalizeText(
  value
) {

  return typeof value === 'string'
    ? value.trim()
    : '';
}
