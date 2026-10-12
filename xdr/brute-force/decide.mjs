/**
 * xdr/brute-force/patterns.json 에서 가져온 무차별 대입 공격 패턴 상수
 */
const PATTERNS = [
  {
    name: "단일 주소 고빈도 로그인 실패 연속",
    condition: "동일 출발 주소(srcip)에서 짧은 시간(1~3분) 안에 30건 이상의 로그인 실패가 집중 발생",
    rationale: "MITRE ATT&CK T1110.001(Password Guessing)에 기반하여 단일 IP에서 비밀번호를 빠르게 반복 대입하는 무차별 공격 신호입니다."
  },
  {
    name: "다수 계정 대상 비밀번호 스프레이",
    condition: "동일 출발 주소(srcip)에서 여러 계정을 대상으로 연속적인 로그인 실패가 발생",
    rationale: "MITRE ATT&CK T1110.003(Password Spraying)에 기반하여 계정 잠금을 우회하기 위해 다수의 계정에 동일 비밀번호를 순차 대입하는 공격 신호입니다."
  },
  {
    name: "성공 없는 대량 로그인 실패 지속",
    condition: "동일 출발 주소(srcip)에서 정상 로그인 성공 없이 50건 이상의 로그인 실패만 지속 누적",
    rationale: "MITRE ATT&CK T1110(Brute Force)에 기반하여 오입력이 아닌 자동화 도구에 의해 지속적으로 실패가 발생하는 무차별 대입 공격 신호입니다."
  }
];

/**
 * 심판 격리 환경을 위해 import/require 및 파일/네트워크 I/O 없이
 * 입력받은 경보(alert)를 자체 계산하여 판정합니다.
 *
 * @param {object} alert Wazuh 형태의 경보 객체
 * @returns {{ action: 'block' | 'alert' | 'record', confidence: number, reason: string }}
 */
export function decide(alert) {
  const level = Number(alert?.rule?.level ?? 0);
  const count = Number(alert?.data?.count ?? 0);
  const hasAccounts = Boolean(alert?.data?.accounts);
  const desc = String(alert?.rule?.description ?? '');
  const mitre = Array.isArray(alert?.rule?.mitre) ? alert.rule.mitre : [];
  const hasT1110 = mitre.includes('T1110');

  // 1. 명확한 무차별 대입 공격 (Level 10 이상 또는 대량 실패 / 다중 계정 스프레이) -> block
  if (level >= 10 || count >= 30 || hasAccounts || (hasT1110 && count >= 20)) {
    let matchedReason = PATTERNS[0].name;

    if (hasAccounts || desc.includes('여러 계정') || desc.includes('서로 다른 계정') || desc.includes('계정 20개')) {
      matchedReason = PATTERNS[1].name;
    } else if (desc.includes('성공은 없습니다') || count >= 50) {
      matchedReason = PATTERNS[2].name;
    }

    return {
      action: 'block',
      confidence: 0.95,
      reason: matchedReason
    };
  }

  // 2. 애매한 시도 / 주의 요망 경보 (Level 5 ~ 9 또는 소량 실패 후 성공 등) -> alert
  if (level >= 5 || (hasT1110 && count > 1) || (level > 3 && desc.includes('실패'))) {
    return {
      action: 'alert',
      confidence: 0.65,
      reason: '소량 로그인 실패 및 주의 패턴 탐지'
    };
  }

  // 3. 정상 이벤트 (Level 3 이하 또는 성공/로그아웃/조회 등) -> record
  return {
    action: 'record',
    confidence: 0.1,
    reason: '정상 사용자 활동 및 허용 이벤트'
  };
}
