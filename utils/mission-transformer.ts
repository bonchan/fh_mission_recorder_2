// utils/mission-transformer.ts
import { getFocalLengthFromZoom, normalizeHeading360 } from '@/utils/utils'
import { Waypoint } from './interfaces';

export const transformWaypointsForExport = (waypoints: Waypoint[], payloadPositionIndex: number) => {
    return waypoints.map((wp, index) => {

        console.log('waypoint: ', index, wp)

        // 1. Start with the base coordinate data
        const waypoint = {
            ...wp,
            index: index,
            waypointSpeed: 5, // Default speed
            isRisky: false,
            ellipsoidHeight: wp.height,
            height: wp.elevation,
            useStraightLine: 1,

        };

        // 2. Add Actions based on your logic (Dynamic Injection)
        const actions = [];
        let actionId = 0

        actions.push({
            actionId: actionId++,
            actionActuatorFunc: "rotateYaw",
            actionActuatorFuncParam: {
                aircraftHeading: normalizeHeading360(wp.yaw),
                aircraftPathMode: "clockwise",
            }
        });

        actions.push({
            actionId: actionId++,
            actionActuatorFunc: "gimbalRotate",
            actionActuatorFuncParam: {
                gimbalRotateMode: "absoluteAngle",
                gimbalPitchRotateEnable: 1,
                gimbalPitchRotateAngle: wp.pitch,
            }
        });

        actions.push({
            actionId: actionId++,
            actionActuatorFunc: "zoom",
            actionActuatorFuncParam: {
                payloadPositionIndex: payloadPositionIndex,
                focalLength: getFocalLengthFromZoom(wp.zoom),
            }
        });

        actions.push({
            actionId: actionId++,
            actionActuatorFunc: "takePhoto",
            actionActuatorFuncParam: {
                payloadPositionIndex: payloadPositionIndex,
                payloadLensIndex: "zoom,ir",
                useGlobalPayloadLensIndex: 1
            }
        });

        // actions.push({
        //     actionId: actionId++,
        //     actionActuatorFunc: "orientedShoot",
        //     actionActuatorFuncParam: {
        //         gimbalPitchRotateAngle: wp.pitch,               // From recorded data
        //         gimbalRollRotateAngle: 0,
        //         gimbalYawRotateAngle: normalizeHeading360(wp.yaw),                   // Align with aircraftHeading for M3E
        //         focusX: 0,                                    // Center (960/2)
        //         focusY: 0,                                    // Center (720/2)
        //         focusRegionWidth: 0,
        //         focusRegionHeight: 0,
        //         focalLength: getFocalLengthFromZoom(wp.zoom),   // Example focal length
        //         aircraftHeading: normalizeHeading360(wp.yaw),                        // True north relative
        //         accurateFrameValid: 0,                          // 1: AI Spot-check ON
        //         payloadPositionIndex: payloadPositionIndex,
        //         // payloadLensIndex: "zoom,ir",                    // "wide", "zoom", or "wide,ir"
        //         useGlobalPayloadLensIndex: 1,
        //         targetAngle: 0,
        //         actionUuid: crypto.randomUUID(),                // Unique ID for image association
        //         imageWidth: 0,
        //         imageHeight: 0,
        //         afPos: 0,
        //         gimbalPort: 0,
        //         // orientedCameraType: 53,                         // 52: M30 Dual, 53: M30T Triple
        //         orientedPhotoMode: "normalPhoto"                // "normalPhoto" or "lowLightSmartShooting"
        //     }
        // });



        // 3. Wrap into an Action Group if actions exist
        if (actions.length > 0) {
            waypoint.actionGroup = {
                actionGroupId: index,
                actionGroupStartIndex: index,
                actionGroupEndIndex: index,
                actionGroupMode: "sequence",
                actionTrigger: {
                    actionTriggerType: "reachPoint"
                },
                actions: actions
            };
        }


        console.log('complete waypoint: ', index, waypoint)

        console.log('')
        console.log('')

        return waypoint;
    });
};