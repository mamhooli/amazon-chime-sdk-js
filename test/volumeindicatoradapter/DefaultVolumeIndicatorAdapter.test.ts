// Copyright 2019-2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as chai from 'chai';

import NoOpLogger from '../../src/logger/NoOpLogger';
import DefaultRealtimeController from '../../src/realtimecontroller/DefaultRealtimeController';
import RealtimeController from '../../src/realtimecontroller/RealtimeController';
import {
  SdkAudioAttendeeState,
  SdkAudioMetadataFrame,
  SdkAudioStreamIdInfo,
  SdkAudioStreamIdInfoFrame,
} from '../../src/signalingprotocol/SignalingProtocol.js';
import DefaultVolumeIndicatorAdapter from '../../src/volumeindicatoradapter/DefaultVolumeIndicatorAdapter';
import VolumeIndicatorAdapter from '../../src/volumeindicatoradapter/VolumeIndicatorAdapter';
import DOMMockBuilder from '../dommock/DOMMockBuilder';

describe('DefaultVolumeIndicatorAdapter', () => {
  let expect: Chai.ExpectStatic;
  let domMockBuilder: DOMMockBuilder;
  const fooAttendee = 'foo-attendee';
  const fooExternal = 'foo-external';
  const minVolumeDecibels = -42;
  const maxVolumeDecibels = -14;

  before(() => {
    domMockBuilder = new DOMMockBuilder();
    expect = chai.expect;
  });

  after(() => {
    domMockBuilder.cleanup();
  });

  describe('construction', () => {
    it('can be constructed', () => {
      const rt: RealtimeController = new DefaultRealtimeController();
      const vi: VolumeIndicatorAdapter = new DefaultVolumeIndicatorAdapter(
        new NoOpLogger(),
        rt,
        minVolumeDecibels,
        maxVolumeDecibels
      );
      expect(vi).to.not.equal(null);
    });
  });

  describe('stream id info frame', () => {
    it('sends mute updates only when mute state changes', () => {
      const streamInfo = SdkAudioStreamIdInfo.create();
      const streamInfoFrame = SdkAudioStreamIdInfoFrame.create();
      streamInfo.audioStreamId = 1;
      streamInfo.attendeeId = fooAttendee;
      streamInfo.externalUserId = fooExternal;
      streamInfoFrame.streams = [streamInfo];
      const rt: RealtimeController = new DefaultRealtimeController();
      let volumeUpdate = 0;
      rt.realtimeSubscribeToVolumeIndicator(
        streamInfo.attendeeId,
        (
          attendeeId: string,
          volume: number | null,
          muted: boolean | null,
          signalStrength: number | null,
          externalUserId: string | null
        ) => {
          if (volumeUpdate === 0) {
            expect(attendeeId).to.equal(fooAttendee);
            expect(volume).to.be.null;
            expect(muted).to.be.false;
            expect(signalStrength).to.be.null;
            expect(externalUserId).to.equal(fooExternal);
          } else if (volumeUpdate === 1) {
            expect(attendeeId).to.equal(fooAttendee);
            expect(volume).to.equal(0);
            expect(muted).to.be.true;
            expect(signalStrength).to.be.null;
            expect(externalUserId).to.equal(fooExternal);
          }
          volumeUpdate += 1;
        }
      );
      let attendeeIdUpdate = 0;
      rt.realtimeSubscribeToAttendeeIdPresence(
        (attendeeId: string, present: boolean, externalUserId: string) => {
          if (attendeeIdUpdate === 0) {
            expect(attendeeId).to.equal(fooAttendee);
            expect(present).to.be.true;
            expect(externalUserId).to.equal(fooExternal);
          } else if (attendeeIdUpdate === 1) {
            expect(attendeeId).to.equal(fooAttendee);
            expect(present).to.be.false;
            expect(externalUserId).to.equal(fooExternal);
          }
          attendeeIdUpdate += 1;
        }
      );
      const vi: VolumeIndicatorAdapter = new DefaultVolumeIndicatorAdapter(
        new NoOpLogger(),
        rt,
        minVolumeDecibels,
        maxVolumeDecibels
      );
      expect(volumeUpdate).to.equal(0);
      expect(attendeeIdUpdate).to.equal(0);
      vi.sendRealtimeUpdatesForAudioStreamIdInfo(streamInfoFrame);
      expect(volumeUpdate).to.equal(0);
      expect(attendeeIdUpdate).to.equal(1);
      delete streamInfoFrame.streams[0].attendeeId;
      streamInfoFrame.streams[0].muted = false;
      vi.sendRealtimeUpdatesForAudioStreamIdInfo(streamInfoFrame);
      expect(volumeUpdate).to.equal(1);
      streamInfoFrame.streams[0].muted = true;
      vi.sendRealtimeUpdatesForAudioStreamIdInfo(streamInfoFrame);
      expect(volumeUpdate).to.equal(2);
      delete streamInfoFrame.streams[0].muted;
      vi.sendRealtimeUpdatesForAudioStreamIdInfo(streamInfoFrame);
      expect(volumeUpdate).to.equal(2);
      expect(attendeeIdUpdate).to.equal(2);
    });
  });

  describe('metadata frame', () => {
    it('sends volume updates when volume changes', () => {
      const streamInfo = SdkAudioStreamIdInfo.create();
      const streamInfoFrame = SdkAudioStreamIdInfoFrame.create();
      streamInfo.audioStreamId = 1;
      streamInfo.attendeeId = fooAttendee;
      streamInfoFrame.streams = [streamInfo];
      const rt: RealtimeController = new DefaultRealtimeController();
      let volumeUpdate = 0;
      rt.realtimeSubscribeToVolumeIndicator(
        streamInfo.attendeeId,
        (
          attendeeId: string,
          volume: number | null,
          muted: boolean | null,
          signalStrength: number | null
        ) => {
          if (volumeUpdate === 0) {
            expect(attendeeId).to.equal(fooAttendee);
            expect(volume).to.equal(0);
            expect(muted).to.be.false;
            expect(signalStrength).to.be.null;
          } else if (volumeUpdate === 1) {
            expect(attendeeId).to.equal(fooAttendee);
            expect(volume).to.equal(0.5);
            expect(muted).to.be.null;
            expect(signalStrength).to.be.null;
          } else if (volumeUpdate === 2) {
            expect(attendeeId).to.equal(fooAttendee);
            expect(volume).to.equal(1.0);
            expect(muted).to.be.null;
            expect(signalStrength).to.be.null;
          }
          volumeUpdate += 1;
        }
      );
      const vi: VolumeIndicatorAdapter = new DefaultVolumeIndicatorAdapter(
        new NoOpLogger(),
        rt,
        minVolumeDecibels,
        maxVolumeDecibels
      );
      expect(volumeUpdate).to.equal(0);
      vi.sendRealtimeUpdatesForAudioStreamIdInfo(streamInfoFrame);
      expect(volumeUpdate).to.equal(0);
      const audioMetadataFrame = SdkAudioMetadataFrame.create();
      const audioState = SdkAudioAttendeeState.create();
      audioState.audioStreamId = streamInfo.audioStreamId;
      audioState.volume = -minVolumeDecibels;
      audioMetadataFrame.attendeeStates = [audioState];
      vi.sendRealtimeUpdatesForAudioMetadata(audioMetadataFrame);
      expect(volumeUpdate).to.equal(1);
      audioState.volume = -(minVolumeDecibels + maxVolumeDecibels) / 2;
      vi.sendRealtimeUpdatesForAudioMetadata(audioMetadataFrame);
      expect(volumeUpdate).to.equal(2);
      audioState.volume = 0;
      vi.sendRealtimeUpdatesForAudioMetadata(audioMetadataFrame);
      expect(volumeUpdate).to.equal(3);
    });

    it('sends signal strength updates when signal strength changes', () => {
      const streamInfo = SdkAudioStreamIdInfo.create();
      const streamInfoFrame = SdkAudioStreamIdInfoFrame.create();
      streamInfo.audioStreamId = 1;
      streamInfo.attendeeId = fooAttendee;
      streamInfoFrame.streams = [streamInfo];
      const rt: RealtimeController = new DefaultRealtimeController();
      let signalStrengthUpdate = 0;
      rt.realtimeSubscribeToVolumeIndicator(
        streamInfo.attendeeId,
        (
          attendeeId: string,
          volume: number | null,
          muted: boolean | null,
          signalStrength: number | null
        ) => {
          if (signalStrengthUpdate === 0) {
            expect(attendeeId).to.equal(fooAttendee);
            expect(volume).to.be.null;
            expect(muted).to.be.null;
            expect(signalStrength).to.equal(0);
          } else if (signalStrengthUpdate === 1) {
            expect(attendeeId).to.equal(fooAttendee);
            expect(volume).to.be.null;
            expect(muted).to.be.null;
            expect(signalStrength).to.equal(0.5);
          } else if (signalStrengthUpdate === 2) {
            expect(attendeeId).to.equal(fooAttendee);
            expect(volume).to.be.null;
            expect(muted).to.be.null;
            expect(signalStrength).to.equal(1);
          }
          signalStrengthUpdate += 1;
        }
      );
      const vi: VolumeIndicatorAdapter = new DefaultVolumeIndicatorAdapter(
        new NoOpLogger(),
        rt,
        minVolumeDecibels,
        maxVolumeDecibels
      );
      expect(signalStrengthUpdate).to.equal(0);
      vi.sendRealtimeUpdatesForAudioStreamIdInfo(streamInfoFrame);
      expect(signalStrengthUpdate).to.equal(0);
      const audioMetadataFrame = SdkAudioMetadataFrame.create();
      const audioState = SdkAudioAttendeeState.create();
      audioState.audioStreamId = streamInfo.audioStreamId;
      audioState.signalStrength = 0;
      audioMetadataFrame.attendeeStates = [audioState];
      vi.sendRealtimeUpdatesForAudioMetadata(audioMetadataFrame);
      expect(signalStrengthUpdate).to.equal(1);
      audioState.signalStrength = 1;
      vi.sendRealtimeUpdatesForAudioMetadata(audioMetadataFrame);
      expect(signalStrengthUpdate).to.equal(2);
      audioState.signalStrength = 2;
      vi.sendRealtimeUpdatesForAudioMetadata(audioMetadataFrame);
      expect(signalStrengthUpdate).to.equal(3);
    });

    it('ignores updates that do not have an attendee id mapping', () => {
      const streamInfo = SdkAudioStreamIdInfo.create();
      const streamInfoFrame = SdkAudioStreamIdInfoFrame.create();
      streamInfo.audioStreamId = 1;
      streamInfo.attendeeId = fooAttendee;
      streamInfoFrame.streams = [streamInfo];
      const rt: RealtimeController = new DefaultRealtimeController();
      let volumeIndicatorUpdate = 0;
      rt.realtimeSubscribeToVolumeIndicator(
        streamInfo.attendeeId,
        (
          attendeeId: string,
          volume: number | null,
          muted: boolean | null,
          signalStrength: number | null
        ) => {
          if (volumeIndicatorUpdate === 0) {
            expect(attendeeId).to.equal(fooAttendee);
            expect(volume).to.equal(1);
            expect(muted).to.be.false;
            expect(signalStrength).to.equal(0);
          }
          volumeIndicatorUpdate += 1;
        }
      );
      const vi: VolumeIndicatorAdapter = new DefaultVolumeIndicatorAdapter(
        new NoOpLogger(),
        rt,
        minVolumeDecibels,
        maxVolumeDecibels
      );
      expect(volumeIndicatorUpdate).to.equal(0);
      vi.sendRealtimeUpdatesForAudioStreamIdInfo(streamInfoFrame);
      expect(volumeIndicatorUpdate).to.equal(0);
      const audioMetadataFrame = SdkAudioMetadataFrame.create();
      const audioState1 = SdkAudioAttendeeState.create();
      audioState1.audioStreamId = streamInfo.audioStreamId;
      audioState1.volume = 0;
      audioState1.signalStrength = 0;
      const audioState2 = SdkAudioAttendeeState.create();
      audioState2.audioStreamId = 0xbad;
      audioState2.volume = 0;
      audioState2.signalStrength = 0;
      audioMetadataFrame.attendeeStates = [audioState1, audioState2];
      vi.sendRealtimeUpdatesForAudioMetadata(audioMetadataFrame);
      expect(volumeIndicatorUpdate).to.equal(1);
      vi.sendRealtimeUpdatesForAudioMetadata(audioMetadataFrame);
      expect(volumeIndicatorUpdate).to.equal(1);
    });

    it('assumes the implicit values when a zero stream id is sent', () => {
      const streamInfo = SdkAudioStreamIdInfo.create();
      const streamInfoFrame = SdkAudioStreamIdInfoFrame.create();
      streamInfo.audioStreamId = 1;
      streamInfo.attendeeId = fooAttendee;
      streamInfoFrame.streams = [streamInfo];
      const rt: RealtimeController = new DefaultRealtimeController();
      let volumeIndicatorUpdate = 0;
      rt.realtimeSubscribeToVolumeIndicator(
        streamInfo.attendeeId,
        (
          attendeeId: string,
          volume: number | null,
          muted: boolean | null,
          signalStrength: number | null
        ) => {
          if (volumeIndicatorUpdate === 0) {
            expect(attendeeId).to.equal(fooAttendee);
            expect(volume).to.equal(0);
            expect(muted).to.be.false;
            expect(signalStrength).to.equal(1);
          }
          volumeIndicatorUpdate += 1;
        }
      );
      const vi: VolumeIndicatorAdapter = new DefaultVolumeIndicatorAdapter(
        new NoOpLogger(),
        rt,
        minVolumeDecibels,
        maxVolumeDecibels
      );
      expect(volumeIndicatorUpdate).to.equal(0);
      vi.sendRealtimeUpdatesForAudioStreamIdInfo(streamInfoFrame);
      expect(volumeIndicatorUpdate).to.equal(0);
      const audioMetadataFrame = SdkAudioMetadataFrame.create();
      const audioState1 = SdkAudioAttendeeState.create();
      audioState1.audioStreamId = 0;
      audioState1.volume = 0;
      audioState1.signalStrength = 0;
      audioMetadataFrame.attendeeStates = [audioState1];
      vi.sendRealtimeUpdatesForAudioMetadata(audioMetadataFrame);
      expect(volumeIndicatorUpdate).to.equal(1);
    });

    it('does not send an update if nothing has changed', () => {
      const streamInfo = SdkAudioStreamIdInfo.create();
      const streamInfoFrame = SdkAudioStreamIdInfoFrame.create();
      streamInfo.audioStreamId = 1;
      streamInfo.attendeeId = fooAttendee;
      streamInfoFrame.streams = [streamInfo];
      const rt: RealtimeController = new DefaultRealtimeController();
      let volumeIndicatorUpdate = 0;
      rt.realtimeSubscribeToVolumeIndicator(
        streamInfo.attendeeId,
        (
          _attendeeId: string,
          _volume: number | null,
          _muted: boolean | null,
          _signalStrength: number | null
        ) => {
          volumeIndicatorUpdate += 1;
        }
      );
      const vi: VolumeIndicatorAdapter = new DefaultVolumeIndicatorAdapter(
        new NoOpLogger(),
        rt,
        minVolumeDecibels,
        maxVolumeDecibels
      );
      expect(volumeIndicatorUpdate).to.equal(0);
      vi.sendRealtimeUpdatesForAudioStreamIdInfo(streamInfoFrame);
      expect(volumeIndicatorUpdate).to.equal(0);
      const audioMetadataFrame = SdkAudioMetadataFrame.create();
      const audioState1 = SdkAudioAttendeeState.create();
      audioState1.audioStreamId = streamInfo.audioStreamId;
      audioMetadataFrame.attendeeStates = [audioState1];
      vi.sendRealtimeUpdatesForAudioMetadata(audioMetadataFrame);
      expect(volumeIndicatorUpdate).to.equal(0);
    });
  });
});
